const { 
    Client, 
    GatewayIntentBits, 
    SlashCommandBuilder, 
    REST, 
    Routes, 
    EmbedBuilder, 
    PermissionFlagsBits 
} = require('discord.js');
const http = require('http');
require('dotenv').config();

// Web sunucusu (Render için)
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Tendo Bot 7/24 Aktif!');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Web sunucusu ${PORT} portunda başlatıldı.`);
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const db = {
    oyuncular: new Map(),
    takimlar: new Map(),
    sezonAktif: false
};

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
    new SlashCommandBuilder().setName('mac-oyna').setDescription('Canlı spikerli maç başlatır.')
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

// Olaylar ve Ağırlıkları (Kırmızı kart ihtimali düşürüldü, pozisyonlar artırıldı)
const olaylar = [
    { metin: "{dakika}' - ⚽ **GOOOOL!** {hücum} harika bir organizasyonla golü buluyor! Skor: {skor}", tip: "gol" },
    { metin: "{dakika}' - ⚽ **MÜTHİŞ GOL!** {hücum} ceza sahası dışından jeneriklik bir gol attı! Skor: {skor}", tip: "gol" },
    { metin: "{dakika}' - 🧤 **HARİKA KURTARIŞ!** {hücum} net pozisyondan yararlanamadı, kaleci devleşti.", tip: "normal" },
    { metin: "{dakika}' - 💥 **DIŞARI GİTTİ!** Top az farkla direğin yanından avuta çıktı.", tip: "normal" },
    { metin: "{dakika}' - 📐 **KORNER!** Tehlikeli bir köşe vuruşu organizasyonu.", tip: "normal" },
    { metin: "{dakika}' - ❌ **DİREKTEN DÖNDÜ!** Sert şut direkte patladı!", tip: "normal" },
    { metin: "{dakika}' - 🟨 **SARI KART!** {defans} orta alanda rakibini indirdi.", tip: "normal" },
    { metin: "{dakika}' - 🟥 **KIRMIZI KART!** {defans} çok sert müdahale sonrası oyundan atıldı!", tip: "kirmizi" }
];

async function canliMacOyna(channel, evSahibi, deplasman) {
    let evSkor = 0;
    let depSkor = 0;
    let mevcutDakika = 1;
    let ilkYariBitti = false;

    const baslangicEmbed = new EmbedBuilder()
        .setTitle(`🎙️ CANLI SPİKER | ${evSahibi} vs ${deplasman}`)
        .setDescription(`Maç başladı! Keyifli seyirler.`)
        .setColor('#e74c3c')
        .setTimestamp();

    await channel.send({ embeds: [baslangicEmbed] });

    const macInterval = setInterval(async () => {
        // Zamanı daha hızlı ilerlet (Her mesajda 3 ile 6 dakika atlar)
        mevcutDakika += Math.floor(Math.random() * 4) + 3;

        // İlk yarı bitişi
        if (mevcutDakika >= 45 && !ilkYariBitti && mevcutDakika < 90) {
            ilkYariBitti = true;
            await channel.send(`⏸️ **İLK YARI BİTTİ!** | Skor: **${evSahibi} ${evSkor} - ${depSkor} ${deplasman}**`).catch(() => {});
            return;
        }

        // Maç bitişi
        if (mevcutDakika >= 90) {
            clearInterval(macInterval);
            const bitisEmbed = new EmbedBuilder()
                .setTitle(`🏁 MAÇ BİTTİ! | ${evSahibi} vs ${deplasman}`)
                .setDescription(`**MAÇ SONUCU:** **${evSahibi} ${evSkor} - ${depSkor} ${deplasman}**`)
                .setColor('#2ecc71')
                .setTimestamp();

            await channel.send({ embeds: [bitisEmbed] }).catch(() => {});
            return;
        }

        // Olay seçimi (Kırmızı kartı nadir yap)
        let secilenOlay;
        const sans = Math.random();
        
        if (sans < 0.03) { 
            // %3 ihtimalle Kırmızı Kart
            secilenOlay = olaylar.find(o => o.tip === "kirmizi");
        } else if (sans < 0.35) { 
            // %32 ihtimalle Gol
            const goller = olaylar.filter(o => o.tip === "gol");
            secilenOlay = goller[Math.floor(Math.random() * goller.length)];
        } else { 
            // Geri kalan %65 ihtimal Normal pozisyonlar
            const normaller = olaylar.filter(o => o.tip === "normal");
            secilenOlay = normaller[Math.floor(Math.random() * normaller.length)];
        }

        const hucumTakim = Math.random() < 0.5 ? evSahibi : deplasman;
        const defansTakim = hucumTakim === evSahibi ? deplasman : evSahibi;

        if (secilenOlay.tip === "gol") {
            if (hucumTakim === evSahibi) evSkor++;
            else depSkor++;
        }

        const guncelSkor = `**${evSahibi} ${evSkor} - ${depSkor} ${deplasman}**`;
        const anlatim = secilenOlay.metin
            .replace('{dakika}', mevcutDakika > 90 ? 90 : mevcutDakika)
            .replace('{hücum}', hucumTakim)
            .replace('{defans}', defansTakim)
            .replace('{skor}', guncelSkor);

        await channel.send(anlatim).catch(() => {});

    }, 8000); // 8 saniyede bir yeni olay ve hızlı akan zaman
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
