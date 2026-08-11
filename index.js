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

// Veritabanı (Bellek içi)
const db = {
    oyuncular: new Map(),
    takimlar: new Map(),
    sezonAktif: false,
    mevcutHafta: 1
};

// Slash Komutlar
const commands = [
    new SlashCommandBuilder().setName('kayit').setDescription('Oyuncu profili oluşturur.')
        .addStringOption(opt => opt.setName('isim').setDescription('Oyuncu Adı Soyadı').setRequired(true))
        .addStringOption(opt => opt.setName('mevki').setDescription('Mevki (ST, CAM, CB, GK vb.)').setRequired(true)),
    new SlashCommandBuilder().setName('profil').setDescription('Oyuncu profilini görüntüler.')
        .addUserOption(opt => opt.setName('hedef').setDescription('Profili görüntülenecek oyuncu')),
    new SlashCommandBuilder().setName('takim').setDescription('Takım bilgisini gösterir.')
        .addStringOption(opt => opt.setName('isim').setDescription('Takım Adı')),
    new SlashCommandBuilder().setName('kadrom').setDescription('Kendi takımınızın kadrosunu listeler.'),
    new SlashCommandBuilder().setName('taktik').setDescription('Takım dizilişini ayarlar.')
        .addStringOption(opt => opt.setName('dizilis').setDescription('Örn: 4-3-3').setRequired(true)),
    new SlashCommandBuilder().setName('transfer').setDescription('Transfer listesini görüntüler.'),
    new SlashCommandBuilder().setName('teklif').setDescription('Teklif yapar.')
        .addUserOption(opt => opt.setName('oyuncu').setDescription('Teklif yapılacak oyuncu').setRequired(true))
        .addIntegerOption(opt => opt.setName('miktar').setDescription('Miktar (€)').setRequired(true)),
    new SlashCommandBuilder().setName('fikstur').setDescription('Fikstürü gösterir.'),
    new SlashCommandBuilder().setName('puan').setDescription('Puan durumunu gösterir.'),
    new SlashCommandBuilder().setName('mac-sonucu').setDescription('Son oynanan maç sonuçlarını gösterir.'),
    new SlashCommandBuilder().setName('istatistik').setDescription('Gol/Asist krallığını gösterir.'),
    new SlashCommandBuilder().setName('sezon-baslat').setDescription('Sezonu başlatır ve kanallara duyuru atar.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('mac-oyna').setDescription('30 dakikalık canlı spikerli maç başlatır.')
        .addStringOption(opt => opt.setName('ev-sahibi').setDescription('Ev Sahibi Takım').setRequired(true))
        .addStringOption(opt => opt.setName('deplasman').setDescription('Deplasman Takımı').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

client.once('ready', async () => {
    console.log(`Bot Tendo League olarak giriş yaptı! (${client.user.tag})`);
    try {
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );
        console.log('Slash komutları başarıyla yüklendi.');
    } catch (error) {
        console.error('Komut yükleme hatası:', error);
    }
});

function findChannelByName(guild, name) {
    return guild.channels.cache.find(c => c.name.toLowerCase().includes(name.toLowerCase()));
}

const olaylar = [
    "{dakika}' - ⚽ **GOOOOL!** {hücum} inanılmaz bir şutla topu ağlara gönderiyor! Skor: {skor}",
    "{dakika}' - 🟨 **SARI KART!** {defans} yaptığı sert müdahale sonrası sarı kart görüyor.",
    "{dakika}' - 🟥 **KIRMIZI KART!** {defans} son adam olarak rakibini düşürdü ve oyundan atıldı!",
    "{dakika}' - 🧤 **NE NEFİS BİR KURTARIŞ!** {hücum} şutunu çekti ama kaleci gole izin vermedi.",
    "{dakika}' - 💥 **DIŞARI GİTTİ!** {hücum} ceza sahası dışından sert vurdu, top az farkla avuta çıktı.",
    "{dakika}' - 📐 **KORNER!** {hücum} takımı tehlikeli bir noktadan köşe vuruşu kullanacak.",
    "{dakika}' - ❌ **DİREKTEN DÖNDÜ!** Harika bir şut ama direk gole izin vermiyor!"
];

async function canliMacOyna(guild, evSahibi, deplasman) {
    const yayinKanali = findChannelByName(guild, 'bein-sports') || findChannelByName(guild, 'exxen');
    if (!yayinKanali) return;

    let evSkor = 0;
    let depSkor = 0;
    let mevcutDakika = 1;

    const baslangicEmbed = new EmbedBuilder()
        .setTitle(`🎙️ CANLI SPİKER | ${evSahibi} vs ${deplasman}`)
        .setDescription(`Hakem düdüğünü çaldı ve maç başladı! 30 dakikalık heyecan başlıyor. Bol şanslar!`)
        .setColor('#e74c3c')
        .setTimestamp();

    await yayinKanali.send({ embeds: [baslangicEmbed] });

    const macInterval = setInterval(async () => {
        if (mevcutDakika === 45) {
            await yayinKanali.send(`⏸️ **İLK YARI BİTTİ!** | İlk Yarı Sonucu: **${evSahibi} ${evSkor} - ${depSkor} ${deplasman}**`);
        }

        if (mevcutDakika === 90) {
            clearInterval(macInterval);
            const bitisEmbed = new EmbedBuilder()
                .setTitle(`🏁 MAÇ BİTTİ! | ${evSahibi} vs ${deplasman}`)
                .setDescription(`Maçın son düdüğü çaldı!\n\n**MAÇ SONUCU:** **${evSahibi} ${evSkor} - ${depSkor} ${deplasman}**`)
                .setColor('#2ecc71')
                .setTimestamp();

            await yayinKanali.send({ embeds: [bitisEmbed] });

            const sonucKanal = findChannelByName(guild, 'mac-sonucu');
            if (sonucKanal) {
                sonucKanal.send({ embeds: [bitisEmbed] });
            }
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

            await yayinKanali.send(anlatim);
        }

        mevcutDakika++;
    }, 20000); // 20 saniye = 1 simülasyon dakikası (Toplam 30 dk)
}

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options, guild, user } = interaction;

    if (commandName === 'kayit') {
        const isim = options.getString('isim');
        const mevki = options.getString('mevki');

        db.oyuncular.set(user.id, { name: isim, mevki, overall: 65, takimId: null, form: 'Normal', sakatlik: 'Yok' });

        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setTitle('⚽ Oyuncu Kaydı Başarılı!')
                    .setColor('#00ff00')
                    .addFields(
                        { name: 'İsim', value: isim, inline: true },
                        { name: 'Mevki', value: mevki, inline: true },
                        { name: 'Genel Reyting (OVR)', value: '65', inline: true }
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
                    .setTitle(`👤 ${p.name} - Oyuncu Profili`)
                    .setColor('#3498db')
                    .addFields(
                        { name: 'Mevki', value: p.mevki, inline: true },
                        { name: 'Reyting (OVR)', value: `${p.overall}`, inline: true },
                        { name: 'Takım', value: p.takimId || 'Serbest Oyuncu', inline: true }
                    )
            ]
        });
    }

    if (commandName === 'sezon-baslat') {
        await interaction.deferReply();
        db.sezonAktif = true;

        const duyuruKanal = findChannelByName(guild, 'duyuru');
        const takvimKanal = findChannelByName(guild, 'takvim');
        const transferKanal = findChannelByName(guild, 'transfer-listesi');
        const skySportKanal = findChannelByName(guild, 'sky-sport');

        if (duyuruKanal) duyuruKanal.send({ embeds: [new EmbedBuilder().setTitle('📢 YENİ SEZON BAŞLADI!').setDescription('Tendo League yeni sezonu açılmıştır. Başarılar dileriz!').setColor('#ff0000')] });
        if (takvimKanal) takvimKanal.send({ embeds: [new EmbedBuilder().setTitle('📅 Sezon Takvimi').setDescription('1. Hafta Maçları yakında başlayacaktır.').setColor('#f1c40f')] });
        if (transferKanal) transferKanal.send({ embeds: [new EmbedBuilder().setTitle('🛒 Transfer Pazarı Açıldı').setDescription('Tekliflerinizi iletebilirsiniz.').setColor('#2ecc71')] });
        if (skySportKanal) skySportKanal.send({ embeds: [new EmbedBuilder().setTitle('📺 Sky Sports').setDescription('Sezon öncesi analizler yayında!').setColor('#9b59b6')] });

        return interaction.editReply('✅ Yeni sezon başlatıldı ve kanallara otomatik duyurular yapıldı!');
    }

    if (commandName === 'mac-oyna') {
        const evSahibi = options.getString('ev-sahibi');
        const deplasman = options.getString('deplasman');

        await interaction.reply({ content: `⏳ **${evSahibi} vs ${deplasman}** maçı canlı spiker anlatımıyla başlatıldı!`, ephemeral: true });
        canliMacOyna(guild, evSahibi, deplasman);
    }
});

client.login(process.env.DISCORD_TOKEN);
