import { 
    Client, GatewayIntentBits, EmbedBuilder, REST, Routes, 
    SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle 
} from "discord.js";
import Groq from "groq-sdk";
import 'dotenv/config'; 

const CONFIG = {
    token: process.env.TOKEN, 
    groq: process.env.GROQ_API_KEY,
    id: "1475162168264757552",
    invite: "https://discord.com/oauth2/authorize?client_id=1475162168264757552&permissions=8&integration_type=0&scope=bot",
    suporte: "https://disboard.org/pt-br/server/1228475851348119572"
};

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

const groq = new Groq({ apiKey: CONFIG.groq });
const chatMemory = new Map();

const commands = [
    new SlashCommandBuilder().setName('debate').setDescription('Debate técnico sobre animes')
        .addStringOption(o => o.setName('tema').setDescription('O que vamos analisar?').setRequired(true)),
    new SlashCommandBuilder().setName('dicas').setDescription('Dicas e curiosidades ninjas')
        .addStringOption(o => o.setName('anime').setDescription('Nome do anime').setRequired(true)),
    new SlashCommandBuilder().setName('suporte').setDescription('Links de suporte e convite')
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(CONFIG.token);

(async () => {
    try {
        await rest.put(Routes.applicationCommands(CONFIG.id), { body: commands });
        console.log('✅ Comandos Anke sincronizados.');
    } catch (e) { console.error('❌ Erro de Autenticação:', e.message); }
})();

client.on("interactionCreate", async i => {
    if (!i.isChatInputCommand()) return;
    await i.deferReply().catch(() => {});

    if (i.commandName === 'suporte') {
        const eb = new EmbedBuilder()
            .setTitle("🏮 Central Anke Shinobi")
            .setColor("#2f3136")
            .setDescription("Precisa de auxílio ou deseja me convidar?");
        
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel('Suporte').setURL(CONFIG.suporte).setStyle(ButtonStyle.Link),
            new ButtonBuilder().setLabel('Convidar').setURL(CONFIG.invite).setStyle(ButtonStyle.Link)
        );
        return i.editReply({ embeds: [eb], components: [row] });
    }

    const isDebate = i.commandName === 'debate';
    const input = i.options.getString(isDebate ? 'tema' : 'anime');
    
    try {
        const res = await groq.chat.completions.create({
            messages: [
                { role: "system", content: "Especialista em animes. Resposta curta e técnica. Máximo 2 parágrafos. PT-BR." },
                { role: "user", content: isDebate ? `Debate: ${input}` : `Fatos sobre: ${input}` }
            ],
            model: "llama-3.3-70b-versatile"
        });

        const embed = new EmbedBuilder()
            .setTitle(isDebate ? "🧠 Análise Técnica" : "💡 Curiosidade")
            .setDescription(res.choices[0].message.content)
            .setColor(isDebate ? "#9b59b6" : "#f1c40f")
            .setFooter({ text: `Anke • ${i.user.username}` });

        await i.editReply({ embeds: [embed] });
    } catch (e) { await i.editReply("❌ IA indisponível no momento."); }
});

client.on("messageCreate", async m => {
    if (m.author.bot || !m.mentions.has(client.user)) return;
    await m.channel.sendTyping();

    let history = chatMemory.get(m.author.id) || [];
    history.push({ role: "user", content: m.content });
    if (history.length > 5) history.shift();

    try {
        const res = await groq.chat.completions.create({
            messages: [
                { role: "system", content: "Ninja inteligente e sarcástico. 1 parágrafo curto. Mantenha o contexto. PT-BR." },
                ...history
            ],
            model: "llama-3.3-70b-versatile"
        });

        const reply = res.choices[0].message.content;
        history.push({ role: "assistant", content: reply });
        chatMemory.set(m.author.id, history);
        m.reply(reply);
    } catch (e) { console.error("Erro Chat IA"); }
});

client.once("ready", () => console.log(`🚀 ${client.user.tag} ONLINE!`));
client.login(CONFIG.token).catch(() => console.error("❌ Erro: Token inválido!"));
