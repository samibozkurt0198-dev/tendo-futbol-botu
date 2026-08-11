const { 
    Client, 
    GatewayIntentBits, 
    SlashCommandBuilder, 
    REST, 
    Routes, 
    EmbedBuilder, 
    PermissionFlagsBits,
    ChannelType 
} = require('discord.js');
const { joinVoiceChannel } = require('@discordjs/voice');
const http = require('http');
const fs = require('fs');
require('dotenv').config();

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
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates
    ]
});

const DB_FILE = './database.json';
let db = {
    oyuncular: {},
    takimlar: {},
    transferPazari: {},
    sezonAktif: false
};

if (fs.existsSync(DB_FILE)) {
    try {
        db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        if (!db.transferPazari) db.transferPazari = {};
        if (!db.oyuncular) db.oyuncular = {};
    } catch (e) {
        console.error("Veritabanı okuma hatası:", e);
    }
}

function veriyiKaydet() {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    } catch (e) {
        console.error("Veri kaydetme hatası:", e);
    }
}

const UNLU_TAKIMLAR = [
    "Galatasaray", "Fenerbahçe", "Beşiktaş", "Trabzonspor",
    "Real Madrid", "Barcelona", "Manchester City", "Arsenal",
    "Liverpool", "Manchester United", "Bayern München", "Borussia Dortmund",
    "Paris Saint-Germain", "Inter", "AC Milan", "Juventus",
    "Atletico Madrid", "Chelsea", "Napoli", "Benfica"
];

const GUNCEL_FUTBOLCULAR = [
    { isim: "Kylian Mbappe", mevki: "SNT", deger: 180 },
    { isim: "Erling Haaland", mevki: "SNT", deger: 175 },
    { isim: "Jude Bellingham", mevki: "OS", deger: 160 },
    { isim: "Vinicius Junior", mevki: "KANAT", deger: 150 },
    { isim: "Bukayo Saka", mevki: "KANAT", deger: 130 },
    { isim: "Phil Foden", mevki: "OS", deger: 125 },
    { isim: "Florian Wirtz", mevki: "OS", deger: 120 },
    { isim: "Jamal Musiala", mevki: "OS", deger: 120 },
    { isim: "Rodri", mevki: "OS", deger: 110 },
    { isim: "Declan Rice", mevki: "OS", deger: 100 },
    { isim: "Federico Valverde", mevki: "OS", deger: 100 },
    { isim: "Lamine Yamal", mevki: "KANAT", deger: 110 },
    { isim: "Martin Odegaard", mevki: "OS", deger: 95 },
    { isim: "Lautaro Martinez", mevki: "SNT", deger: 95 },
    { isim: "Harry Kane", mevki: "SNT", deger: 90 },
    { isim: "William Saliba", mevki: "STP", deger: 85 },
    { isim: "Ruben Dias", mevki: "STP", deger: 80 },
    { isim: "Thibaut Courtois", mevki: "KL", deger: 75 },
    { isim: "Alisson Becker", mevki: "KL", deger: 70 },
    { isim: "Marc-Andre ter Stegen", mevki: "KL", deger: 65 },
    { isim: "Cole Palmer", mevki: "OS", deger: 90 },
    { isim: "Rodrygo", mevki: "KANAT", deger: 90 },
    { isim: "Victor Osimhen", mevki: "SNT", deger: 90 },
    { isim: "Khvicha Kvaratskhelia", mevki: "KANAT", deger: 85 },
    { isim: "Alexis Mac Allister", mevki: "OS", deger: 75 },
    { isim: "Antonio Rüdiger", mevki: "STP", deger: 60 },
    { isim: "Virgil van Dijk", mevki: "STP", deger: 55 },
    { isim: "Bruno Fernandes", mevki: "OS", deger: 70 },
    { isim: "Son Heung-min", mevki: "KANAT", deger: 65 },
    { isim: "Kevin De Bruyne", mevki: "OS", deger: 70 },
    { isim: "Mohamed Salah", mevki: "KANAT", deger: 75 },
    { isim: "Antoine Griezmann", mevki: "SNT", deger: 50 },
    { isim: "Paulo Dybala", mevki: "OS", deger: 45 },
    { isim: "Rafael Leao", mevki: "KANAT", deger: 85 },
    { isim: "Theo Hernandez", mevki: "DF", deger: 75 },
    { isim: "Achraf Hakimi", mevki: "DF", deger: 70 },
    { isim: "Alessandro Bastoni", mevki: "STP", deger: 75 },
    { isim: "Ederson", mevki: "KL", deger: 65 },
    { isim: "Mike Maignan", mevki: "KL", deger: 70 },
    { isim: "Arda Güler", mevki: "OS", deger: 45 },
    { isim: "Kenan Yıldız", mevki: "KANAT", deger: 40 },
    { isim: "Barış Alper Yılmaz", mevki: "KANAT", deger: 25 },
    { isim: "Kerem Aktürkoğlu", mevki: "KANAT", deger: 22 },
    { isim: "Ferdi Kadıoğlu", mevki: "DF", deger: 30 },
    { isim: "Hakan Çalhanoğlu", mevki: "OS", deger: 45 },
    { isim: "Orkun Kökçü", mevki: "OS", deger: 28 },
    { isim: "Semih Kılıçsoy", mevki: "SNT", deger: 20 },
    { isim: "Victor Boniface", mevki: "SNT", deger: 45 },
    { isim: "Jeremie Frimpong", mevki: "DF", deger: 50 },
    { isim: "Alejandro Garnacho", mevki: "KANAT", deger: 50 },
    { isim: "Kobbie Mainoo", mevki: "OS", deger: 55 },
    { isim: "Endrick", mevki: "SNT", deger: 60 },
    { isim: "Xavi Simons", mevki: "OS", deger: 75 },
    { isim: "Benjamin Sesko", mevki: "SNT", deger: 50 },
    { isim: "Joshua Zirkzee", mevki: "SNT", deger: 40 },
    { isim: "Joao Neves", mevki: "OS", deger: 60 },
    { isim: "Leny Yoro", mevki: "STP", deger: 50 }
];

function otomatikTakimlariVeFutbolculariYukle() {
    let takimEklendi = 0;
    if (!db.takimlar) db.takimlar = {};
    UNLU_TAKIMLAR.forEach(takimIsmi => {
        const key = takimIsmi.toLowerCase();
        if (!db.takimlar[key]) {
            db.takimlar[key] = {
                isim: takimIsmi,
                kurucu: null,
                puan: 0,
                av: 0,
                o: 0,
                g: 0,
                b: 0,
                m: 0,
                butce: 150000000,
                sonSponsor: 0
            };
            takimEklendi++;
        }
    });

    if (!db.oyuncular || Object.keys(db.oyuncular).length < 20) {
        db.oyuncular = {};
        GUNCEL_FUTBOLCULAR.forEach((f, index) => {
            const id = `oyuncu_${index + 1}`;
            const maas = Math.floor(f.deger * 25000);
            db.oyuncular[id] = {
                id: id,
                name: f.isim,
                mevki: f.mevki,
                piyasaDegeri: f.deger,
                maas: maas,
                gol: 0,
                sakatlik: 0,
                cezali: 0,
                takim: 'Serbest'
            };
        });
    }

    veriyiKaydet();
    return takimEklendi;
}

const commands = [
    new SlashCommandBuilder()
        .setName('otomatik-kurulum')
        .setDescription('Takımları ve güncel 2026 futbolcu havuzunu kurar (Yönetici).')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('futbolcu-havuzu')
        .setDescription('Transfer edilebilir güncel 2026 futbolcularını listeler.')
        .addIntegerOption(opt => opt.setName('sayfa').setDescription('Görmek istediğin sayfa numarası')),

    new SlashCommandBuilder()
        .setName('transfer-teklif')
        .setDescription('Futbolcuya bonservis ve maaş teklif ederek transfer edersiniz.')
        .addStringOption(opt => opt.setName('futbolcu-adi').setDescription('Futbolcunun adı').setRequired(true))
        .addIntegerOption(opt => opt.setName('bonservis').setDescription('Bonservis bedeli (Milyon € cinsinden)').setRequired(true))
        .addIntegerOption(opt => opt.setName('haftalik-maas').setDescription('Haftalık maaş (€)').setRequired(true)),

    new SlashCommandBuilder().setName('takimlar').setDescription('Ligdeki tüm takımları ve bütçeleri listeler.'),
    new SlashCommandBuilder().setName('takim-sec').setDescription('Bir takımın Teknik Direktörü olursunuz.')
        .addStringOption(opt => opt.setName('takim-adi').setDescription('Takım adı').setRequired(true)),
    new SlashCommandBuilder().setName('puan-durumu').setDescription('Güncel puan durumunu gösterir.'),
    new SlashCommandBuilder().setName('gol-kralligi').setDescription('Gol krallığını listeler.'),
    new SlashCommandBuilder().setName('kadrom').setDescription('Takımınızdaki futbolcuları ve maaşları gösterir.'),
    new SlashCommandBuilder().setName('sponsor').setDescription('Sponsorluk geliri alırsınız.'),
    new SlashCommandBuilder().setName('butce').setDescription('Bütçenizi görüntüler.'),
    
    new SlashCommandBuilder()
        .setName('butce-ver')
        .setDescription('İstediğiniz takıma bütçe ekler (Yönetici).')
        .addStringOption(opt => opt.setName('takim-adi').setDescription('Takım adı (Örn: Galatasaray)').setRequired(true))
        .addIntegerOption(opt => opt.setName('miktar').setDescription('Eklenecek Miktar (Milyon € cinsinden)').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder().setName('gol-sesi-kanal').setDescription('Gol ses kanalı ayarlar.')
        .addChannelOption(opt => opt.setName('kanal').setDescription('Ses Kanalı').addChannelTypes(ChannelType.GuildVoice).setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('sezon-baslat').setDescription('Sezonu başlatır.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('sezon-durdur').setDescription('Sezonu durdurur.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('lig-sifirla').setDescription('Ligi sıfırlar.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCOD_TOKEN || process.env.DISCORD_TOKEN);

client.once('ready', async () => {
    console.log(`Bot ${client.user.tag} olarak giriş yaptı!`);
    otomatikTakimlariVeFutbolculariYukle();

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

const olaylar = [
    { metin: "{dakika}' - ⚽ **GOOOOL!** {hücum} takımından **{oyuncu}** harika bir vuruşla fileleri havalandırdı! Skor: {skor}", tip: "gol" },
    { metin: "{dakika}' - ⚽ **MÜTHİŞ GOL!** {hücum} yıldızı **{oyuncu}** tribünleri coşturan harika bir gol attı! Skor: {skor}", tip: "gol" },
    { metin: "{dakika}' - 🧤 **HARİKA KURTARIŞ!** {hücum} şutunu çekti ama kaleci devleşti.", tip: "normal" },
    { metin: "{dakika}' - 💥 **DIŞARI GİTTİ!** Top az farkla direğin yanından auta çıktı.", tip: "normal" },
    { metin: "{dakika}' - 📐 **KORNER!** Tehlikeli köşe vuruşu.", tip: "normal" },
    { metin: "{dakika}' - ❌ **DİREKTEN DÖNDÜ!** Sert şut direkten patladı!", tip: "normal" },
    { metin: "{dakika}' - 🟨 **SARI KART!** Sert müdahale.", tip: "normal" }
];

function rastgeleFutbolcuSec() {
    if (!db.oyuncular) db.oyuncular = {};
    const tumu = Object.values(db.oyuncular).filter(o => !o.sakatlik && !o.cezali);
    if (tumu.length > 0) {
        return tumu[Math.floor(Math.random() * tumu.length)];
    }
    return { name: "Bilinmeyen Futbolcu", id: null };
}

let golKanalId = null;
let aktifMacInterval = null;

async function golSesiCal(guild) {
    if (!golKanalId) return;
    try {
        const channel = await guild.channels.fetch(golKanalId).catch(() => null);
        if (!channel || channel.type !== ChannelType.GuildVoice) return;
        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
        });
        setTimeout(() => { try { connection.destroy(); } catch(e){} }, 4000);
    } catch(e) {}
}

function canliMacOyna(channel, evSahibi, deplasman, guild) {
    return new Promise(async (resolve) => {
        let evSkor = 0;
        let depSkor = 0;
        let mevcutDakika = 1;
        let ilkYariBitti = false;

        const baslangicEmbed = new EmbedBuilder()
            .setTitle(`🎙️ CANLI MAÇ | ${evSahibi} vs ${deplasman}`)
            .setDescription(`Karşılaşma hakemin düdüğüyle başladı!`)
            .setColor('#e74c3c');

        await channel.send({ embeds: [baslangicEmbed] }).catch(() => {});

        aktifMacInterval = setInterval(async () => {
            if (!db.sezonAktif) {
                clearInterval(aktifMacInterval);
                aktifMacInterval = null;
                resolve(false);
                return;
            }

            mevcutDakika += Math.floor(Math.random() * 4) + 3;

            if (mevcutDakika >= 45 && !ilkYariBitti && mevcutDakika < 90) {
                ilkYariBitti = true;
                await channel.send(`⏸️ **İLK YARI BİTTİ!** | Skor: **${evSahibi} ${evSkor} - ${depSkor} ${deplasman}**`).catch(() => {});
                return;
            }

            if (mevcutDakika >= 90) {
                clearInterval(aktifMacInterval);
                aktifMacInterval = null;
                const bitisEmbed = new EmbedBuilder()
                    .setTitle(`🏁 MAÇ BİTTİ! | ${evSahibi} vs ${deplasman}`)
                    .setDescription(`**MAÇ SONUCU:** **${evSahibi} ${evSkor} - ${depSkor} ${deplasman}**`)
                    .setColor('#2ecc71');

                await channel.send({ embeds: [bitisEmbed] }).catch(() => {});
                istatistikGuncelle(evSahibi, deplasman, evSkor, depSkor);
                resolve(true);
                return;
            }

            let secilenOlay;
            const sans = Math.random();
            if (sans < 0.18) { 
                const goller = olaylar.filter(o => o.tip === "gol");
                secilenOlay = goller[Math.floor(Math.random() * goller.length)];
            } else { 
                const normaller = olaylar.filter(o => o.tip === "normal");
                secilenOlay = normaller[Math.floor(Math.random() * normaller.length)];
            }

            const hucumTakim = Math.random() < 0.5 ? evSahibi : deplasman;
            const defansTakim = hucumTakim === evSahibi ? deplasman : evSahibi;
            const secilenFutbolcu = rastgeleFutbolcuSec();

            if (secilenOlay.tip === "gol") {
                if (hucumTakim === evSahibi) evSkor++;
                else depSkor++;

                if (secilenFutbolcu && secilenFutbolcu.id && db.oyuncular[secilenFutbolcu.id]) {
                    db.oyuncular[secilenFutbolcu.id].gol = (db.oyuncular[secilenFutbolcu.id].gol || 0) + 1;
                    veriyiKaydet();
                }
                if (guild) golSesiCal(guild);
            }

            const guncelSkor = `**${evSahibi} ${evSkor} - ${depSkor} ${deplasman}**`;
            const anlatim = secilenOlay.metin
                .replace('{dakika}', mevcutDakika > 90 ? 90 : mevcutDakika)
                .replace('{hücum}', hucumTakim)
                .replace('{defans}', defansTakim)
                .replace('{oyuncu}', secilenFutbolcu.name)
                .replace('{skor}', guncelSkor);

            await channel.send(anlatim).catch(() => {});

        }, 6000);
    });
}

function istatistikGuncelle(ev, dep, evSkor, depSkor) {
    let keyEv = ev.toLowerCase();
    let keyDep = dep.toLowerCase();
    if (!db.takimlar[keyEv] || !db.takimlar[keyDep]) return;

    let tEv = db.takimlar[keyEv];
    let tDep = db.takimlar[keyDep];

    tEv.o++; tDep.o++;
    tEv.av += (evSkor - depSkor);
    tDep.av += (depSkor - evSkor);

    let evToplamMaas = 0;
    let depToplamMaas = 0;
    Object.values(db.oyuncular).forEach(f => {
        if (f.takim === tEv.isim) evToplamMaas += (f.maas || 10000);
        if (f.takim === tDep.isim) depToplamMaas += (f.maas || 10000);
    });

    tEv.butce -= evToplamMaas;
    tDep.butce -= depToplamMaas;

    if (evSkor > depSkor) {
        tEv.puan += 3; tEv.g++; tDep.m++;
        tEv.butce += 2000000;
    } else if (depSkor > evSkor) {
        tDep.puan += 3; tDep.g++; tEv.m++;
        tDep.butce += 2000000;
    } else {
        tEv.puan += 1; tEv.b++;
        tDep.puan += 1; tDep.b++;
        tEv.butce += 1000000; tDep.butce += 1000000;
    }
    veriyiKaydet();
}

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    try {
        const { commandName, options, user, channel, member, guild } = interaction;
        if (!db.oyuncular) db.oyuncular = {};
        if (!db.takimlar) db.takimlar = {};

        if (commandName === 'otomatik-kurulum') {
            otomatikTakimlariVeFutbolculariYukle();
            return interaction.reply({
                embeds: [new EmbedBuilder().setTitle('⚽ Sistem Güncellendi').setDescription(`Güncel 2026 sezonu futbolcuları (**${Object.keys(db.oyuncular).length} adet**) ve takımlar yüklendi!`).setColor('#2ecc71')],
                flags: 64
            });
        }

        if (commandName === 'futbolcu-havuzu') {
            const sayfa = options.getInteger('sayfa') || 1;
            const oyuncular = Object.values(db.oyuncular).filter(o => o.takim === 'Serbest');
            const limit = 20;
            const maxSayfa = Math.ceil(oyuncular.length / limit) || 1;
            
            if (sayfa < 1 || sayfa > maxSayfa) {
                return interaction.reply({ content: `❌ Geçersiz sayfa! 1 ile ${maxSayfa} arasında bir sayı gir.`, flags: 64 });
            }

            const baslangic = (sayfa - 1) * limit;
            const listeSlices = oyuncular.slice(baslangic, baslangic + limit);
            
            let liste = "";
            listeSlices.forEach((f, i) => {
                liste += `**${baslangic + i + 1}. ${f.name}** | Mevki: **${f.mevki}** | Değer: **${f.piyasaDegeri}M€** | Maaş: **€${f.maas.toLocaleString()}**\n`;
            });

            return interaction.reply({ 
                embeds: [new EmbedBuilder()
                    .setTitle(`📋 GÜNCEL 2026 TRANSFER HAVUZU (Sayfa ${sayfa}/${maxSayfa})`)
                    .setDescription(liste)
                    .setColor('#3498db')
                    .setFooter({ text: 'Diğer sayfalar için: /futbolcu-havuzu sayfa:2' })
                ] 
            });
        }

        if (commandName === 'transfer-teklif') {
            const kulup = Object.values(db.takimlar).find(t => t.kurucu === user.id);
            if (!kulup) return interaction.reply({ content: '❌ Bir takımın T.D.si olmalısın!', flags: 64 });

            const mevcutFutbolcular = Object.values(db.oyuncular).filter(f => f.takim === kulup.isim);
            if (mevcutFutbolcular.length >= 16) {
                return interaction.reply({ 
                    embeds: [new EmbedBuilder()
                        .setTitle('❌ Kadro Dolu!')
                        .setDescription(`Takımınızda en fazla **16 oyuncu** (11 İlk 11 + 5 Yedek) bulunabilir.`)
                        .setColor('#e74c3c')
                    ], 
                    flags: 64 
                });
            }

            const futbolcuAdi = options.getString('futbolcu-adi').toLowerCase();
            const bonservisMilyon = options.getInteger('bonservis');
            const haftalikMaas = options.getInteger('haftalik-maas');
            const gercekBonservis = bonservisMilyon * 1000000;

            const hedefFutbolcu = Object.values(db.oyuncular).find(f => f.name.toLowerCase().includes(futbolcuAdi) && f.takim === 'Serbest');
            if (!hedefFutbolcu) return interaction.reply({ content: '❌ Bu isimde serbest futbolcu bulunamadı!', flags: 64 });

            if (kulup.butce < gercekBonservis) return interaction.reply({ content: '❌ Kulüp kasasında yeterli bütçe yok!', flags: 64 });

            const minKabulBonservis = hedefFutbolcu.piyasaDegeri * 0.95;

            if (bonservisMilyon < (hedefFutbolcu.piyasaDegeri * 0.70)) {
                return interaction.reply({ 
                    embeds: [new EmbedBuilder()
                        .setTitle('❌ Teklif Çok Düşük (Reddedildi)')
                        .setDescription(`Yıldız oyuncunun kulübü bu teklifi komik buldu ve masadan kalktı! Oyuncunun piyasa değeri: **${hedefFutbolcu.piyasaDegeri}M€**. Daha yüksek bir teklif yapmalısın.`)
                        .setColor('#e74c3c')
                    ], 
                    flags: 64 
                });
            }

            if (bonservisMilyon < minKabulBonservis) {
                const karsiBonservis = Math.round(hedefFutbolcu.piyasaDegeri * (0.95 + Math.random() * 0.15));
                const karsiMaas = Math.round(karsiBonservis * 27000);
                
                return interaction.reply({ 
                    embeds: [new EmbedBuilder()
                        .setTitle('🤝 KULÜPTEN KARŞI TEKLİF (PAZARLIK)')
                        .setDescription(`Teklifiniz değerlendirildi ancak kulüp daha yüksek bir bedel talep ediyor!\n\n⚽ Oyuncu: **${hedefFutbolcu.name}**\n📋 **Kulübün İstediği Karşı Teklif:**\n💰 Bonservis: **${karsiBonservis}M€**\n💶 Haftalık Maaş: **€${karsiMaas.toLocaleString()}**\n\n*(Tekrar /transfer-teklif yazarak bu fiyatlar üzerinden anlaşmayı deneyebilirsin!)*`)
                        .setColor('#f39c12')
                    ], 
                    flags: 64 
                });
            }

            kulup.butce -= gercekBonservis;
            hedefFutbolcu.takim = kulup.isim;
            hedefFutbolcu.maas = haftalikMaas;
            veriyiKaydet();

            return interaction.reply({ 
                embeds: [new EmbedBuilder()
                    .setTitle('🤝 TRANSFER BAŞARILI!')
                    .setDescription(`Tebrikler! **${hedefFutbolcu.name}**, **€${gercekBonservis.toLocaleString()}** bonservis ile **${kulup.isim}** takımına katıldı! (${mevcutFutbolcular.length + 1}/16)`)
                    .setColor('#2ecc71')
                ] 
            });
        }

        if (commandName === 'kadrom') {
            const kulup = Object.values(db.takimlar).find(t => t.kurucu === user.id);
            if (!kulup) return interaction.reply({ content: '❌ Bir takımın T.D.si olmalısın.', flags: 64 });

            const futbolcularim = Object.values(db.oyuncular).filter(f => f.takim === kulup.isim);
            if (futbolcularim.length === 0) return interaction.reply({ content: '❌ Kadronuzda henüz futbolcu yok.', flags: 64 });

            let liste = "";
            let toplamMaas = 0;
            futbolcularim.forEach((f, i) => {
                toplamMaas += f.maas;
                liste += `**${i + 1}. ${f.name}** | ${f.mevki} | Değer: ${f.piyasaDegeri}M€ | Maaş: €${f.maas.toLocaleString()}\n`;
            });

            return interaction.reply({ embeds: [new EmbedBuilder().setTitle(`🛡️ KADRO | ${kulup.isim} (${futbolcularim.length}/16)`).setDescription(liste).addFields({ name: '💸 Toplam Haftalık Maaş', value: `€${toplamMaas.toLocaleString()}` }).setColor('#f1c40f')] });
        }

        if (commandName === 'takimlar') {
            const takimlar = Object.values(db.takimlar);
            let liste = "";
            takimlar.forEach((t, i) => {
                const tdBilgi = t.kurucu && t.kurucu !== "Sistem" ? `<@${t.kurucu}>` : "Boşta";
                liste += `**${i + 1}. ${t.isim}** | T.D: ${tdBilgi} | Kasa: €${t.butce.toLocaleString()}\n`;
            });
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🛡️ TAKIMLAR VE BÜTÇELER').setDescription(liste).setColor('#3498db')] });
        }

        if (commandName === 'takim-sec') {
            const girilenIsim = options.getString('takim-adi').trim().toLowerCase();
            const ztnBaskasi = Object.values(db.takimlar).find(t => t.kurucu === user.id);
            if (ztnBaskasi) return interaction.reply({ content: `❌ Zaten ${ztnBaskasi.isim} takımı yöneticisiniz!`, flags: 64 });

            const bulunanKey = Object.keys(db.takimlar).find(k => k === girilenIsim || db.takimlar[k].isim.toLowerCase().includes(girilenIsim));
            if (!bulunanKey) return interaction.reply({ content: '❌ Takım bulunamadı!', flags: 64 });

            const secilenTakim = db.takimlar[bulunanKey];
            if (secilenTakim.kurucu && secilenTakim.kurucu !== "Sistem") return interaction.reply({ content: '❌ Bu takımın T.D.si var!', flags: 64 });

            secilenTakim.kurucu = user.id;
            veriyiKaydet();
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('👔 T.D. OLUNDU!').setDescription(`Artık **${secilenTakim.isim}** teknik direktörüsün. Başarılar!`).setColor('#2ecc71')] });
        }

        if (commandName === 'gol-kralligi') {
            const oyuncular = Object.values(db.oyuncular).filter(o => o.gol > 0).sort((a, b) => b.gol - a.gol).slice(0, 10);
            if (oyuncular.length === 0) return interaction.reply({ content: 'Henüz gol atan oyuncu yok.', flags: 64 });
            let liste = "";
            oyuncular.forEach((o, i) => { liste += `**${i + 1}. ${o.name}** (${o.takim}) - **${o.gol} Gol**\n`; });
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('⚽ GOL KRALLIĞI').setDescription(liste).setColor('#e67e22')] });
        }

        if (commandName === 'gol-sesi-kanal') {
            const kanal = options.getChannel('kanal');
            golKanalId = kanal.id;
            return interaction.reply({ content: `✅ Gol ses kanalı <#${kanal.id}> olarak ayarlandı.`, flags: 64 });
        }

        if (commandName === 'sponsor') {
            const kulup = Object.values(db.takimlar).find(t => t.kurucu === user.id);
            if (!kulup) return interaction.reply({ content: '❌ T.D. olmalısın.', flags: 64 });
            const simdi = Date.now();
            if (simdi - (kulup.sonSponsor || 0) < 10800000) return interaction.reply({ content: '⏳ Sponsor için süre dolmadı.', flags: 64 });

            const gelir = Math.floor(Math.random() * 5000000) + 3000000;
            kulup.butce += gelir;
            kulup.sonSponsor = simdi;
            veriyiKaydet();
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('💼 SPONSOR GELİRİ!').setDescription(`Kasaya €${gelir.toLocaleString()} eklendi.`).setColor('#f1c40f')] });
        }

        if (commandName === 'butce') {
            const kulup = Object.values(db.takimlar).find(t => t.kurucu === user.id);
            if (!kulup) return interaction.reply({ content: '❌ T.D. değilsin.', flags: 64 });
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle(`💰 Bütçe: ${kulup.isim}`).setDescription(`Kasa: **€${kulup.butce.toLocaleString()}**`).setColor('#2ecc71')] });
        }

        if (commandName === 'butce-ver') {
            const girilenTakim = options.getString('takim-adi').trim().toLowerCase();
            const miktarMilyon = options.getInteger('miktar');
            const eklenenPara = miktarMilyon * 1000000;

            const bulunanKey = Object.keys(db.takimlar).find(k => k === girilenTakim || db.takimlar[k].isim.toLowerCase().includes(girilenTakim));
            if (!bulunanKey) return interaction.reply({ content: '❌ Belirtilen isimde takım bulunamadı!', flags: 64 });

            const hedefTakim = db.takimlar[bulunanKey];
            hedefTakim.butce += eklenenPara;
            veriyiKaydet();

            return interaction.reply({ 
                embeds: [new EmbedBuilder()
                    .setTitle('💰 BÜTÇE EKLENDİ')
                    .setDescription(`**${hedefTakim.isim}** takımının kasasına **€${eklenenPara.toLocaleString()}** eklendi!\nYeni Toplam Kasa: **€${hedefTakim.butce.toLocaleString()}**`)
                    .setColor('#2ecc71')
                ],
                flags: 64 
            });
        }

        if (commandName === 'puan-durumu') {
            const takimlar = Object.values(db.takimlar).sort((a, b) => b.puan - a.puan || b.av - a.av);
            let liste = "";
            takimlar.forEach((t, i) => { liste += `**${i + 1}. ${t.isim}** | O: ${t.o} | Puan: ${t.puan}\n`; });
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🏆 PUAN DURUMU').setDescription(liste).setColor('#3498db')] });
        }

        if (commandName === 'sezon-baslat') {
            let takimListesi = Object.values(db.takimlar);
            if (takimListesi.length < 2) return interaction.reply({ content: '❌ En az 2 takım olmalı!', flags: 64 });

            db.sezonAktif = true;
            veriyiKaydet();
            await interaction.reply({ content: `🚀 **SEZON BAŞLADI!** Maçlar oynanıyor.` });

            for (let i = 0; i < takimListesi.length; i++) {
                for (let j = i + 1; j < takimListesi.length; j++) {
                    if (!db.sezonAktif) break;
                    const ev = takimListesi[i].isim;
                    const dep = takimListesi[j].isim;

                    await channel.send(`📢 **MAÇ:** **${ev} vs ${dep}**`);
                    const sonuc = await canliMacOyna(channel, ev, dep, guild);
                    if (!sonuc) break;
                    await new Promise(r => setTimeout(r, 4000));
                }
                if (!db.sezonAktif) break;
            }

            if (db.sezonAktif) {
                db.sezonAktif = false;
                veriyiKaydet();
                await channel.send(`🎉 **SEZON TAMAMLANDI!**`);
            }
        }

        if (commandName === 'sezon-durdur') {
            db.sezonAktif = false;
            veriyiKaydet();
            if (aktifMacInterval) clearInterval(aktifMacInterval);
            return interaction.reply({ content: '🛑 Sezon durduruldu.', flags: 64 });
        }

        if (commandName === 'lig-sifirla') {
            Object.values(db.takimlar).forEach(t => {
                t.puan = 0; t.av = 0; t.o = 0; t.g = 0; t.b = 0; t.m = 0;
            });
            db.sezonAktif = false;
            veriyiKaydet();
            return interaction.repo({ content: '🔄 Lig sıfırlandı.', flags: 64 }); // Düzeltildi
        }

    } catch (err) {
        console.error('Komut hatası:', err);
    }
});

client.login(process.env.DISCOD_TOKEN || process.env.DISCORD_TOKEN);
