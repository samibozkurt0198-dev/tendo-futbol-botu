const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    InteractionType, 
    PermissionFlagsBits, 
    ChannelType 
} = require('discord.js');
const http = require('http');
require('dotenv').config();

// Web Sunucusu (Render Uptime Portu)
const PORT = process.env.PORT || 10000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Tendo Lig Botu Aktif!');
}).listen(PORT, () => {
    console.log(`🌐 Web sunucusu ${PORT} portunda dinleniyor.`);
});

// Client Tanımlama
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Veri Hafızası
const playerData = new Map();
const clubData = new Map();

function initClubs() {
    const clubs = [
        { id: 'rmadrid', name: 'Real Madrid', manager: null, roleName: 'Real Madrid' },
        { id: 'barca', name: 'Barcelona', manager: null, roleName: 'Barcelona' },
        { id: 'arsenal', name: 'Arsenal', manager: null, roleName: 'Arsenal' },
        { id: 'chelsea', name: 'Chelsea', manager: null, roleName: 'Chelsea' },
        { id: 'mcity', name: 'Manchester City', manager: null, roleName: 'Manchester City' },
        { id: 'psg', name: 'Paris Saint-Germain', manager: null, roleName: 'PSG' }
    ];

    clubs.forEach(c => {
        clubData.set(c.id, {
            ...c,
            budget: 800.0,
            tactic: '4-2-4',
            mentality: '⚔️ Ofansif',
            pres: '🔺 Yüksek Pres',
            tempo: '📐 Kısa Pas',
            squad: []
        });
    });
}
initClubs();

function getPlayer(id, username) {
    if (!playerData.has(id)) {
        playerData.set(id, { name: username, team: 'Serbest', role: 'Kayıtsız', value: 20.0 });
    }
    return playerData.get(id);
}

async function updateFreeTeamsChannel(guild) {
    const ch = guild.channels.cache.find(c => c.name.includes('boş-takımlar'));
    if (!ch) return;

    let text = '🏆 **LİG TAKIM DURUMLARI (BOŞ / DOLU TAKIMLAR)**\n----------------------------------------\n';
    clubData.forEach(club => {
        const status = club.manager ? `🔴 **DOLU** (T.D: <@${club.manager}>)` : '🟢 **BOŞ** (Menajer Aranıyor)';
        text += `• **${club.name}**: ${status}\n`;
    });

    const messages = await ch.messages.fetch({ limit: 5 }).catch(() => null);
    if (messages && messages.first() && messages.first().author.id === client.user.id) {
        await messages.first().edit(text);
    } else {
        await ch.send(text);
    }
}

// Bot Başarıyla Girince
client.once('ready', () => {
    console.log(`=============================================`);
    console.log(`🎉 BAŞARILI! BOT DİSCORD'A GİRDİ: ${client.user.tag}`);
    console.log(`=============================================`);
});

// Otomatik Rol Verme
client.on('guildMemberAdd', async (member) => {
    try {
        const unregRole = member.guild.roles.cache.find(r => r.name === 'Kayıtsız');
        if (unregRole) await member.roles.add(unregRole);
    } catch (e) {
        console.error('Rol verme hatası:', e);
    }
});

// Komutlar
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const args = message.content.trim().split(/ +/);
    const command = args[0].toLowerCase();

    if (command === '.kur') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ Bu komutu sadece **Yöneticiler** kullanabilir!');
        }

        const statusMsg = await message.channel.send('⏳ **Kanallar ve roller kuruluyor...**');

        try {
            const unregRole = await message.guild.roles.create({ name: 'Kayıtsız', color: '#808080' }).catch(() => null);
            const playerRole = await message.guild.roles.create({ name: 'Futbolcu', color: '#1abc9c' }).catch(() => null);
            const tdRole = await message.guild.roles.create({ name: 'Teknik Direktör', color: '#e67e22' }).catch(() => null);

            for (const club of clubData.values()) {
                await message.guild.roles.create({ name: club.roleName, color: '#9b59b6' }).catch(() => null);
            }

            const catInfo = await message.guild.channels.create({ name: '📢 İDARİ VE DUYURULAR', type: ChannelType.GuildCategory });
            await message.guild.channels.create({ name: '📢・duyurular', type: ChannelType.GuildText, parent: catInfo.id });
            const chBos = await message.guild.channels.create({ name: '📋・boş-takımlar', type: ChannelType.GuildText, parent: catInfo.id });

            const catReg = await message.guild.channels.create({ name: '📝 KAYIT MERKEZİ', type: ChannelType.GuildCategory });
            const chKayit = await message.guild.channels.create({ name: '📝・kayıt-ol', type: ChannelType.GuildText, parent: catReg.id });

            const regEmbed = new EmbedBuilder()
                .setTitle('Freeze League Hoş Geldiniz!')
                .setColor('#2b2d31')
                .setDescription('Kayıt olmak için aşağıdaki butonları kullanın.');

            const regRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('btn_reg_player').setLabel('Futbolcu Kaydı').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('btn_reg_td').setLabel('Teknik Direktör Kaydı').setStyle(ButtonStyle.Primary)
            );

            await chKayit.send({ embeds: [regEmbed], components: [regRow] });
            await updateFreeTeamsChannel(message.guild);

            return statusMsg.edit(`✅ **Lig Altyapısı Kuruldu!**\n• **Kayıt:** ${chKayit}`);
        } catch (e) {
            console.error('Kurulum hatası:', e);
            return statusMsg.edit('❌ Kurulum sırasında hata oluştu.');
        }
    }
});

// Etkileşimler
client.on('interactionCreate', async (interaction) => {
    try {
        if (interaction.isButton()) {
            if (interaction.customId === 'btn_reg_player') {
                const modal = new ModalBuilder().setCustomId('modal_reg_player').setTitle('Futbolcu Kayıt Formu');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('p_name').setLabel('İsim | Ülke | Değer').setPlaceholder('Örn: D.Beckham | 🏴󠁧󠁢󠁥󠁮󠁧󠁿 | OOS | 1M€').setStyle(TextInputStyle.Short).setRequired(true))
                );
                return await interaction.showModal(modal);
            }
        }
    } catch (err) {
        console.error('Etkileşim hatası:', err);
    }
});

// ==========================================
// BAĞLANTI VE DETAYLI HATA LOGLARI
// ==========================================
const token = process.env.TOKEN || process.env.DISCORD_TOKEN;

console.log('----------------------------------------');
if (!token) {
    console.error('❌ CRITICAL HATA: Render Environment kısmında TOKEN bulunamadı!');
} else {
    console.log('🔑 Token okundu, Discord ağ bağlantısı deneniyor...');
    client.login(token)
        .then(() => {
            console.log('🚀 client.login İŞLEMİ TAMAMLANTI');
        })
        .catch(err => {
            console.error('❌ DISCORD BAĞLANMA HATASI AÇIKLAMASI:');
            console.error(err);
        });
}
console.log('----------------------------------------');
