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

// --- ROL VE YETKİ AYARLARI ---
const KAYIT_YETKILI_ROL_ID = 'BURAYA_KAYIT_YETKILISI_ROL_ID_YAZ';
const DEGER_YETKILI_ROL_ID = 'BURAYA_DEGER_YETKILISI_ROL_ID_YAZ';
// ------------------------------

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
    oyuncular: {}, // Yapay zeka futbolcular havuzu
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

// Hazır 20 Ünlü Takım Listesi
const UNLU_TAKIMLAR = [
    "Galatasaray", "Fenerbahçe", "Beşiktaş", "Trabzonspor",
    "Real Madrid", "Barcelona", "Manchester City", "Arsenal",
    "Liverpool", "Manchester United", "Bayern München", "Borussia Dortmund",
    "Paris Saint-Germain", "Inter", "AC Milan", "Juventus",
    "Atletico Madrid", "Chelsea", "Napoli", "Benfica"
];

// Rastgele Yapay Zeka Futbolcu Üretme Havuzu İçin İsimler
const AI_ISIMLERI = [
    "Alexandre Silva", "Lucas Santos", "Marco Rossi", "Mateo Fernandez", "Kevin De Jong",
    "Gabriel Barbosa", "David Silva", "Christian Eriksen", "Emre Demir", "Burak Yılmaz",
    "Carlos Alberto", "Diego Costa", "Mario Gomez", "Andres Iniesta", "Felipe Anderson",
    "Jude Bellingham", "Bukayo Saka", "Erling Haaland", "Kylian Mbappe", "Vinicius Junior",
    "Federico Chiesa", "Dusan Vlahovic", "Theo Hernandez", "Nicolo Barella", "Rafael Leao"
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
                butce: 20000000, // 20 Milyon Euro Başlangıç Bütçesi
                sonSponsor: 0,
                gorev: null,
                gorevTamamlandi: false
            };
            takimEklendi++;
        }
    });

    // Eğer hiç yapay zeka futbolcu yoksa başlangıçta 30 tane üretelim
    if (Object.keys(db.oyuncular).length === 0) {
        const mevkiler = ["SNT", "KANAT", "OS", "STP", "KL"];
        for (let i = 1; i <= 35; i++) {
            const rastgeleIsim = AI_ISIMLERI[Math.floor(Math.random() * AI_ISIMLERI.length)] + ` (${i})`;
            const rastgeleMevki = mevkiler[Math.floor(Math.random() * mevkiler.length)];
            const piyasaDegeri = Math.floor(Math.random() * 15) + 2; // 2M€ ile 17M€ arası
            const maas = Math.floor(piyasaDegeri * 15000); // Değerine göre haftalık maaş

            const id = `ai_oyuncu_${i}_${Date.now()}`;
            db.oyuncular[id] = {
                id: id,
                name: rastgeleIsim,
                mevki: rastgeleMevki,
                piyasaDegeri: piyasaDegeri,
                maas: maas,
                gol: 0,
                sakatlik: 0,
                cezali: 0,
                takim: 'Serbest'
            };
        }
    }

    veriyiKaydet();
    return takimEklendi;
}

const commands = [
    new SlashCommandBuilder()
        .setName('otomatik-kurulum')
        .setDescription('Ünlü takımları ve yapay zeka futbolcu havuzunu oluşturur (Yönetici).')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('futbolcu-havuzu')
        .setDescription('Transfer edilebilecek yapay zeka futbolcuları listeler.'),

    new SlashCommandBuilder()
        .setName('transfer-teklif')
        .setDescription('Yapay zeka futbolcusuna bonservis ve maaş teklif ederek transfer edersiniz.')
        .addStringOption(opt => opt.setName('futbolcu-adi').setDescription('Transfer etmek istediğiniz futbolcunun adı').setRequired(true))
        .addIntegerOption(opt => opt.setName('bonservis').setDescription('Ödenecek bonservis bedeli (€)').setRequired(true))
        .addIntegerOption(opt => opt.setName('haftalik-maas').setDescription('Önerilecek haftalık maaş (€)').setRequired(true)),

    new SlashCommandBuilder().setName('takimlar').setDescription('Ligdeki tüm takımları, bütçelerini ve T.D. durumlarını listeler.'),

    new SlashCommandBuilder().setName('takim-sec').setDescription('Boştaki bir takımın Teknik Direktörü (T.D.) olursunuz.')
        .addStringOption(opt => opt.setName('takim-adi').setDescription('Seçmek istediğiniz takımın adı').setRequired(true)),

    new SlashCommandBuilder().setName('puan-durumu').setDescription('Ligdeki güncel puan durumunu gösterir.'),

    new SlashCommandBuilder().setName('gol-kralligi').setDescription('En çok gol atan futbolcuları listeler.'),

    new SlashCommandBuilder().setName('kadrom').setDescription('Takımınızda oynayan futbolcuları ve toplam maaş yükünü gösterir.'),

    new SlashCommandBuilder().setName('sponsor').setDescription('Takımınız için sponsorluk geliri alırsınız (3 saatte bir).'),

    new SlashCommandBuilder().setName('butce').setDescription('Takımınızın bütçesini görüntüler.'),

    new SlashCommandBuilder().setName('gol-sesi-kanal').setDescription('Botun gol anında bağlanıp ses çalacağı ses kanalını ayarlar.')
        .addChannelOption(opt => opt.setName('kanal').setDescription('Ses Kanalı').addChannelTypes(ChannelType.GuildVoice).setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder().setName('sezon-baslat').setDescription('Lig sezonunu başlatır ve maçları oynatır.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder().setName('sezon-durdur').setDescription('Devam eden lig sezonunu durdurur.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder().setName('lig-sifirla').setDescription('Lig verilerini sıfırlar (Yönetici).')
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
    { metin: "{dakika}' - ⚽ **MÜTHİŞ GOL!** {hücum} oyuncusu **{oyuncu}** tribünleri coşturan harika bir gol attı! Skor: {skor}", tip: "gol" },
    { metin: "{dakika}' - 🧤 **HARİKA KURTARIŞ!** {hücum} şutunu çekti ama kaleci devleşti.", tip: "normal" },
    { metin: "{dakika}' - 💥 **DIŞARI GİTTİ!** Top az farkla direğin yanından auta çıktı.", tip: "normal" },
    { metin: "{dakika}' - 📐 **KORNER!** Tehlikeli bir köşe vuruşu organizasyonu.", tip: "normal" },
    { metin: "{dakika}' - ❌ **DİREKTEN DÖNDÜ!** Sert şut direkte patladı!", tip: "normal" },
    { metin: "{dakika}' - 🟨 **SARI KART!** {defans} oyuncusu sert bir müdahale yaptı.", tip: "normal" },
    { metin: "{dakika}' - 🚑 **SAKATLIK!** {hücum} oyuncusu **{oyuncu}** sakatlandı.", tip: "sakatlik" }
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

        setTimeout(() => {
            try { connection.destroy(); } catch(e){}
        }, 4000);
    } catch(e) {
        console.error("Gol ses çalma hatası:", e);
    }
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
            .setColor('#e74c3c')
            .setTimestamp();

        await channel.send({ embeds: [baslangicEmbed] }).catch(() => {});

        aktifMacInterval = setInterval(async () => {
            if (!db.sezonAktif) {
                clearInterval(aktifMacInterval);
                aktifMacInterval = null;
                await channel.send(`🛑 **MAÇ DURDURULDU!**`).catch(() => {});
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
                    .setColor('#2ecc71')
                    .setTimestamp();

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

    // Maç sonunda kulüpler kadrolarındaki futbolcuların toplam maaşlarını bütçelerinden öderler!
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
        tEv.butce += 200000;
    } else if (depSkor > evSkor) {
        tDep.puan += 3; tDep.g++; tEv.m++;
        tDep.butce += 200000;
    } else {
        tEv.puan += 1; tEv.b++;
        tDep.puan += 1; tDep.b++;
        tEv.butce += 100000; tDep.butce += 100000;
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
            const eklenen = otomatikTakimlariVeFutbolculariYukle();
            return interaction.reply({
                embeds: [new EmbedBuilder().setTitle('⚽ Sistem Kuruldu').setDescription(`Ünlü takımlar ve **${Object.keys(db.oyuncular).length} adet** yapay zeka futbolcu havuza eklendi!`).setColor('#2ecc71')]
            });
        }

        if (commandName === 'futbolcu-havuzu') {
            const serbestler = Object.values(db.oyuncular).filter(o => o.takim === 'Serbest').slice(0, 15);
            if (serbestler.length === 0) return interaction.reply({ content: '❌ Havuzda boşta futbolcu kalmadı.', ephemeral: true });
            
            let liste = "";
            serbestler.forEach((f, i) => {
                liste += `**${i + 1}. ${f.name}** | Mevki: **${f.mevki}** | Değer: **${f.piyasaDegeri}M€** | Maaş: **€${f.maas.toLocaleString()}**\n`;
            });

            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('📋 TRANSFER HAVUZU (BOŞTAKİLER)').setDescription(liste).setColor('#3498db')] });
        }

        if (commandName === 'transfer-teklif') {
            const kulup = Object.values(db.takimlar).find(t => t.kurucu === user.id);
            if (!kulup) return interaction.reply({ content: '❌ Transfer teklifi yapmak için bir takımın Teknik Direktörü olmalısın!', ephemeral: true });

            const futbolcuAdi = options.getString('futbolcu-adi').toLowerCase();
            const bonservis = options.getInteger('bonservis');
            const haftalikMaas = options.getInteger('haftalik-maas');

            const hedefFutbolcu = Object.values(db.oyuncular).find(f => f.name.toLowerCase().includes(futbolcuAdi) && f.takim === 'Serbest');
            if (!hedefFutbolcu) return interaction.reply({ content: '❌ Bu isimde serbest bir futbolcu bulunamadı!', ephemeral: true });

            if (kulup.butce < bonservis) return interaction.reply({ content: '❌ Kulüp kasasında bu bonservisi ödeyecek yeterli bütçe yok!', ephemeral: true });

            // Kabul şartı: İstediği bonservisin en az %80'ini ve maaşını teklif ettiyse kabul eder
            if (bonservis < (hedefFutbolcu.piyasaDegeri * 800000)) {
                return interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Teklif Reddedildi').setDescription(`Futbolcu menajeri bu bonservis teklifini az buldu. Oyuncunun piyasa değerine uygun bir teklif yapmalısın.`).setColor('#e74c3c')] });
            }

            kulup.butce -= bonservis;
            hedefFutbolcu.takim = kulup.isim;
            hedefFutbolcu.maas = haftalikMaas;
            veriyiKaydet();

            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🤝 TRANSFER BAŞARILI!').setDescription(`Tebrikler! **${hedefFutbolcu.name}**, **€${bonservis.toLocaleString()}** bonservis ve **€${haftalikMaas.toLocaleString()}** maaş şartlarıyla ${kulup.isim} takımına transfer oldu!`).setColor('#2ecc71')] });
        }

        if (commandName === 'kadrom') {
            const kulup = Object.values(db.takimlar).find(t => t.kurucu === user.id);
            if (!kulup) return interaction.reply({ content: '❌ Bir takımın T.D.si olmalısın.', ephemeral: true });

            const futbolcularim = Object.values(db.oyuncular).filter(f => f.takim === kulup.isim);
            if (futbolcularim.length === 0) return interaction.reply({ content: '❌ Takımınızda henüz futbolcu bulunmuyor.', ephemeral: true });

            let liste = "";
            let toplamMaas = 0;
            futbolcularim.forEach((f, i) => {
                toplamMaas += f.maas;
                liste += `**${i + 1}. ${f.name}** | ${f.mevki} | Değer: ${f.piyasaDegeri}M€ | Maaş: €${f.maas.toLocaleString()}\n`;
            });

            return interaction.reply({ embeds: [new EmbedBuilder().setTitle(`🛡️ KADRO VE MAAŞLAR | ${kulup.isim}`).setDescription(liste).addFields({ name: '💸 Toplam Haftalık Maaş Yükü', value: `€${toplamMaas.toLocaleString()}` }).setColor('#f1c40f')] });
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
            if (ztnBaskasi) return interaction.reply({ content: `❌ Zaten **${ztnBaskasi.isim}** takımının T.D.sisin!`, ephemeral: true });

            const bulunanKey = Object.keys(db.takimlar).find(k => k === girilenIsim || db.takimlar[k].isim.toLowerCase().includes(girilenIsim));
            if (!bulunanKey) return interaction.reply({ content: '❌ Takım bulunamadı!', ephemeral: true });

            const secilenTakim = db.takimlar[bulunanKey];
            if (secilenTakim.kurucu && secilenTakim.kurucu !== "Sistem") return interaction.reply({ content: '❌ Bu takımın T.D.si var!', ephemeral: true });

            secilenTakim.kurucu = user.id;
            veriyiKaydet();
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('👔 T.D. OLUNDU!').setDescription(`Artık **${secilenTakim.isim}** teknik direktörüsün.`).setColor('#2ecc71')] });
        }

        if (commandName === 'gol-kralligi') {
            const oyuncular = Object.values(db.oyuncular).filter(o => o.gol > 0).sort((a, b) => b.gol - a.gol).slice(0, 10);
            if (oyuncular.length === 0) return interaction.reply({ content: 'Gol atan futbolcu yok.', ephemeral: true });
            let liste = "";
            oyuncular.forEach((o, i) => { liste += `**${i + 1}. ${o.name}** (${o.takim}) - **${o.gol} Gol**\n`; });
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('⚽ GOL KRALLIĞI').setDescription(liste).setColor('#e67e22')] });
        }

        if (commandName === 'gol-sesi-kanal') {
            const kanal = options.getChannel('kanal');
            golKanalId = kanal.id;
            return interaction.reply({ content: `✅ Gol ses kanalı <#${kanal.id}> olarak ayarlandı.` });
        }

        if (commandName === 'sponsor') {
            const kulup = Object.values(db.takimlar).find(t => t.kurucu === user.id);
            if (!kulup) return interaction.reply({ content: '❌ T.D. olmalısın.', ephemeral: true });
            const simdi = Date.now();
            if (simdi - (kulup.sonSponsor || 0) < 10800000) return interaction.reply({ content: '⏳ Sponsor için süre henüz dolmadı.', ephemeral: true });

            const gelir = Math.floor(Math.random() * 500000) + 300000;
            kulup.butce += gelir;
            kulup.sonSponsor = simdi;
            veriyiKaydet();
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('💼 SPONSOR GELİRİ!').setDescription(`Kasaya €${gelir.toLocaleString()} eklendi.`).setColor('#f1c40f')] });
        }

        if (commandName === 'butce') {
            const kulup = Object.values(db.takimlar).find(t => t.kurucu === user.id);
            if (!kulup) return interaction.reply({ content: '❌ T.D. değilsin.', ephemeral: true });
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle(`💰 Bütçe: ${kulup.isim}`).setDescription(`Kasa: **€${kulup.butce.toLocaleString()}**`).setColor('#2ecc71')] });
        }

        if (commandName === 'puan-durumu') {
            const takimlar = Object.values(db.takimlar).sort((a, b) => b.puan - a.puan || b.av - a.av);
            let liste = "";
            takimlar.forEach((t, i) => { liste += `**${i + 1}. ${t.isim}** | O: ${t.o} | Puan: ${t.puan}\n`; });
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🏆 PUAN DURUMU').setDescription(liste).setColor('#3498db')] });
        }

        if (commandName === 'sezon-baslat') {
            let takimListesi = Object.values(db.takimlar);
            if (takimListesi.length < 2) return interaction.reply({ content: '❌ En az 2 takım olmalı!', ephemeral: true });

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
            return interaction.reply({ content: '🛑 Sezon durduruldu.' });
        }

        if (commandName === 'lig-sifirla') {
            Object.values(db.takimlar).forEach(t => {
                t.puan = 0; t.av = 0; t.o = 0; t.g = 0; t.b = 0; t.m = 0;
            });
            db.sezonAktif = false;
            veriyiKaydet();
            return interaction.reply({ content: '🔄 Lig sıfırlandı.' });
        }

    } catch (err) {
        console.error('Komut hatası:', err);
    }
});

client.login(process.env.DISCOD_TOKEN || process.env.DISCORD_TOKEN);
