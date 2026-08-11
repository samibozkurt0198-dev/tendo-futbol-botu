const { 
    Client, 
    GatewayIntentBits, 
    SlashCommandBuilder, 
    REST, 
    Routes, 
    EmbedBuilder, 
    PermissionFlagsBits 
} = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Veritabanı
const db = {
    oyuncular: new Map(),
    takimlar: new Map(),
    sezonAktif: false
};

// Slash Komutlar
const commands = [
    new SlashCommandBuilder().setName('kayit').setDescription('Oyuncu profili oluşturur.')
        .addStringOption(opt => opt.setName('isim').setDescription('Oyuncu Adı Soyadı').setRequired(true))
        .addStringOption(opt => opt.setName('mevki').setDescription('Mevki (ST, CAM, CB, GK vb.)').setRequired(true)),
    new SlashCommandBuilder().setName('profil').setDescription('Oyuncu profilini görüntüler.')
        .addUserOption(opt => opt.setName('hedef').setDescription('Profili görüntülenecek oyuncu')),
    new SlashCommandBuilder().setName('taktik').setDescription('Takım dizilişini ayarlar.')
        .addStringOption(opt => opt.setName('dizilis').setDescription('Örn: 4-3-3').setRequired(true)),
    new SlashCommandBuilder().setName('sezon-baslat').setDescription('Sezonu başlatır ve kanallara duyuru atar.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('mac-oyna').setDescription('30 dakikalık canlı spikerli maç başlatır.')
        .addStringOption(opt => opt.setName('ev-sahibi').setDescription('Ev Sahibi Takım').setRequired(true))
        .addStringOption(opt => opt.setName('deplasman').setDescription('Deplasman Takımı').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

client.once('ready', async () => {
    console.log(`Bot ${client.user.tag} olarak giriş yaptı!`);
    try {
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );
        console.log('Slash komutları güncellendi.');
    } catch (error) {
        console.error('Komut yükleme hatası:', error);
    }
});

function findChannelByName(guild, name) {
    return guild.channels.cache.find(c => c.name.toLowerCase().includes(name.toLowerCase()) && c.isTextBased());
}

const olaylar = [
    "{dakika}' - ⚽ **GOOOOL!** {hücum} inanılmaz bir şutla topu ağlara gönderiyor! Skor: {skor}",
    "{dakika}' - 🟨 **SARI KART!** {defans} yaptığı sert müdahale sonrası sarı kart görüyor.",
    "{dakika}' - 🟥 **KIRMIZI KART!** {defans} son adam olarak rakibini düşürdü!",
    "{dakika}' - 🧤 **NE NEFİS KURTARIŞ!** {hücum} şutunu çekti ama kaleci çıkardı.",
    "{dakika}' - 💥 **DIŞARI GİTTİ!** Top az farkla avuta çıktı.",
    "{dakika}' - 📐 **KORNER!** Tehlikeli bir köşe vuruşu şansı.",
    "{dakika}' - ❌ **DİREKTEN DÖNDÜ!** Harika bir şut ama direk!"
];

async function canliMacOyna(channel, evSahibi, deplasman) {
    let evSkor = 0;
    let depSkor = 0;
    let mevcutDakika = 1;

    const baslangicEmbed = new EmbedBuilder()
        .setTitle(`🎙️ CANLI SPİKER | ${evSahibi} vs ${deplasman}`)
        .setDescription(`Maç başladı! 30 dakikalık heyecan başlıyor.`)
        .setColor('#e74c3c')
        .setTimestamp();

    await channel.send({ embeds: [baslangicEmbed] });

    const macInterval = setInterval(async () => {
        if (mevcutDakika === 45) {
            await channel.send(`⏸️ **İLK YARI BİTTİ!** | Skor: **${evSahibi} ${evSkor} - ${depSkor} ${deplasman}**`);
        }

        if (mevcutDakika === 90) {
            clearInterval(macInterval);
            const bitisEmbed = new EmbedBuilder()
                .setTitle(`🏁 MAÇ BİTTİ! | ${evSahibi} vs ${deplasman}`)
                .setDescription(`**MAÇ SONUCU:** **${evSahibi} ${evSkor} - ${depSkor} ${deplasman}**`)
                .setColor('#2ecc71')
                .setTimestamp();

            await channel.send({ embeds: [bitisEmbed] });
            return;
        }

        if (Math.random() < 0.35) {
            const rastgeleOlay = olaylar[Math.floor(Math.random() * olaylar.length)];
            const hucumTakim = Math.random() < 0.5 ? evSahibi : deplasman;
            const defansTakim = hucumTakim === evSahibi ? deplasman : evSahibi;

            if (rastgeleOlay.includes('GOOOOL')) {
                if (hucumTakim === evSahibi) evSkor++;
                else depSkor++;
            }

            const guncelSkor = `**${evSahibi} ${evSkor} - ${depSkor} ${deplasman}**`;
            const anlatim = rastgeleOlay
                .replace('{dakika}', mevcutDakika)
                .replace('{hücum}', hucumTakim)
                .replace('{defans}', defansTakim)
                .replace('{skor}', guncelSkor);

            await channel.send(anlatim).catch(() => {});
        }

        mevcutDakika++;
    }, 20000); // 20 saniyede bir 1 dk ilerler
}

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    try {
        const { commandName, options, guild, user, channel } = interaction;

        if (commandName === 'kayit') {
            const isim = options.getString('isim');
            const mevki = options.getString('mevki');

            db.oyuncular.set(user.id, { name: isim, mevki, overall: 65 });

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('⚽ Oyuncu Kaydı Başarılı!')
                        .setColor('#00ff00')
                        .addFields(
                            { name: 'İsim', value: isim, inline: true },
                            { name: 'Mevki', value: mevki, inline: true },
                            { name: 'Reyting', value: '65', inline: true }
                        )
                ]
            });
        }

        if (commandName === 'profil') {
            const target = options.getUser('hedef') || user;
            const p = db.oyuncular.get(target.id);

            if (!p) return interaction.reply({ content: 'Oyuncu profili bulunamadı.', ephemeral: true });

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(`👤 ${p.name} - Profil`)
                        .setColor('#3498db')
                        .addFields(
                            { name: 'Mevki', value: p.mevki, inline: true },
                            { name: 'Reyting', value: `${p.overall}`, inline: true }
                        )
                ]
            });
        }

        if (commandName === 'taktik') {
            const dizilis = options.getString('dizilis');
            return interaction.reply({ content: `✅ Takım dizilişiniz **${dizilis}** olarak güncellendi.` });
        }

        if (commandName === 'sezon-baslat') {
            db.sezonAktif = true;

            const duyuruKanal = findChannelByName(guild, 'duyuru');
            if (duyuruKanal) {
                await duyuruKanal.send({ embeds: [new EmbedBuilder().setTitle('📢 YENİ SEZON BAŞLADI!').setDescription('Tendo League yeni sezonu açılmıştır!').setColor('#ff0000')] }).catch(() => {});
            }

            return interaction.reply({ content: '✅ Sezon başarıyla başlatıldı!' });
        }

        if (commandName === 'mac-oyna') {
            const evSahibi = options.getString('ev-sahibi');
            const deplasman = options.getString('deplasman');

            await interaction.reply({ content: `⏳ **${evSahibi} vs ${deplasman}** maçı bu kanalda başlatılıyor...` });
            canliMacOyna(channel, evSahibi, deplasman);
        }
    } catch (err) {
        console.error('Komut hatası:', err);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: 'Bir hata oluştu, lütfen tekrar deneyin.', ephemeral: true }).catch(() => {});
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
