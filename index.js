import { 
    Client, GatewayIntentBits, EmbedBuilder, REST, Routes, 
    SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle 
} from "discord.js";
import Groq from "groq-sdk";

const CONFIG = {
    token: "MTQ3NTE2MjE2ODI2NDc1NzU1Mg.G5vdE1.tcaK8pLq_mYOMitGeRLXX0PZSamq1mIK67RGGI",
    groq: "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",
    id: "1475162168264757552",
    invite: "https://discord.com/oauth2/authorize?client_id=1475162168264757552&permissions=8&integration_type=0&scope=bot",
    suporte: "https://disboard.org/pt-br/server/1228475851348119572"
};

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});
const groq = new Groq({ apiKey: CONFIG.groq });
const chatMemory = new Map();

// --- REGISTRO DE COMANDOS ---
const commands = [
    new SlashCommandBuilder().setName('debate').setDescription('Debate técnico e profundo sobre um tema')
        .addStringOption(o => o.setName('tema').setDescription('O que vamos debater?').setRequired(true)),
    new SlashCommandBuilder().setName('dicas').setDescription('Curiosidades e dicas ninjas')
        .addStringOption(o => o.setName('anime').setDescription('Nome do anime').setRequired(true)),
    new SlashCommandBuilder().setName('suporte').setDescription('Links de suporte e convite oficial')
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(CONFIG.token);
(async () => {
    try {
        await rest.put(Routes.applicationCommands(CONFIG.id), { body: commands });
        console.log('✅ Comandos Finais Registrados.');
    } catch (e) { console.error('Erro no registro:', e); }
})();

// --- LÓGICA DE INTERAÇÃO (SLASH COMMANDS) ---
client.on("interactionCreate", async i => {
    if (!i.isChatInputCommand()) return;

    await i.deferReply().catch(() => {});

    if (i.commandName === 'suporte') {
        const eb = new EmbedBuilder()
            .setTitle("🏮 Central de Ajuda Shinobi")
            .setColor("#2f3136")
            .setDescription("Precisa de ajuda ou quer me levar para sua vila?");
        
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel('Suporte').setURL(CONFIG.suporte).setStyle(ButtonStyle.Link),
            new ButtonBuilder().setLabel('Me Convidar').setURL(CONFIG.invite).setStyle(ButtonStyle.Link)
        );
        return i.editReply({ embeds: [eb], components: [row] });
    }

    const isDebate = i.commandName === 'debate';
    const input = i.options.getString(isDebate ? 'tema' : 'anime');
    
    try {
        const res = await groq.chat.completions.create({
            messages: [
                { role: "system", content: "Você é um especialista em animes técnico e direto. Máximo 2 parágrafos curtos. PT-BR." },
                { role: "user", content: isDebate ? `Debate profundo sobre: ${input}` : `Dicas e curiosidades sobre: ${input}` }
            ],
            model: "llama-3.3-70b-versatile"
        });

        const embed = new EmbedBuilder()
            .setTitle(isDebate ? "🧠 Análise Técnica" : "💡 Curiosidade Shinobi")
            .setDescription(res.choices[0].message.content)
            .setColor(isDebate ? "#9b59b6" : "#f1c40f")
            .setFooter({ text: `Solicitado por ${i.user.username}` });

        await i.editReply({ embeds: [embed] });
    } catch (e) {
        await i.editReply("❌ A conexão com a Grande Árvore (IA) falhou. Tente novamente.");
    }
});

// --- CONVERSA POR MENÇÃO (COM MEMÓRIA) ---
client.on("messageCreate", async m => {
    if (m.author.bot || !m.mentions.has(client.user)) return;

    await m.channel.sendTyping();

    let history = chatMemory.get(m.author.id) || [];
    history.push({ role: "user", content: m.content });
    if (history.length > 5) history.shift();

    try {
        const res = await groq.chat.completions.create({
            messages: [
                { role: "system", content: "Você é um ninja inteligente e sarcástico. Mantenha o contexto. Responda em no máximo 1 parágrafo curto. PT-BR." },
                ...history
            ],
            model: "llama-3.3-70b-versatile"
        });

        const reply = res.choices[0].message.content;
        history.push({ role: "assistant", content: reply });
        chatMemory.set(m.author.id, history);

        await m.reply(reply);
    } catch (e) {
        console.error("Erro na Conversa:", e);
    }
});

client.once("ready", () => {
    console.log(`🚀 ${client.user.tag} ONLINE | Código 100% Finalizado.`);
    client.user.setActivity('Debates Ninjas', { type: 3 }); // "Assistindo Debates Ninjas"
});

client.login(CONFIG.token);
