const { 
    Client, 
    GatewayIntentBits, 
    SlashCommandBuilder, 
    REST, 
    Routes, 
    EmbedBuilder, 
    PermissionFlagsBits, 
    ChannelType, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    InteractionType
} = require('discord.js');
const { joinVoiceChannel } = require('@discordjs/voice');
const http = require('http');
const fs = require('fs');
require('dotenv').config();

// ==========================================
// 1. WEB SUNUCUSU (Render / Glitch 7/24 Uptime)
// ==========================================
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Tendo Futbol Botu 7/24 Aktif!');
});
server.listen(process.env.PORT || 3000, () => {
    console.log('Web sunucusu dinleniyor...');
});

// ==========================================
// 2. BOT İSTEMCİSİ VE VERİ YAPILARI
// ==========================================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates
    ]
});

const players = new Map();
const activeQuizzes = new Map();

function getPlayerData(userId, username) {
    if (!players.has(userId)) {
        players.set(userId, {
            name: username,
            value: 20.0,
            overall: 75,
            antCount: 0,
            antCd: 0,
            penCd: 0
        });
    }
    return players.get(userId);
}

// ==========================================
// 3. HAZIR OLDUĞUNDA VE KOMUT DİNLENİCİLERİ
// ==========================================
client.on('ready', () => {
    console.log(`🤖 ${client.user.tag} GitHub ve Render altyapısıyla aktif!`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const args = message.content.trim().split(/ +/);
    const command = args[0].toLowerCase();

    // Üye Arama (.ara <isim>)
    if (command === '.ara') {
        const query = args.slice(1).join(' ').toLowerCase();
        if (!query) return message.reply('❌ Lütfen bir isim girin!');

        const members = await message.guild.members.fetch();
        const matched = members.filter(m => m.displayName.toLowerCase().includes(query) || m.user.username.toLowerCase().includes(query));

        const embed = new EmbedBuilder()
            .setTitle('🔍 Üye Arama Sistemi')
            .setColor('#2b2d31')
            .setDescription(`Aranan: **${query}**\nBulunan: **${matched.size}**\n\n` +
                (matched.map(m => `🟢 **${m.displayName}** (<@${m.id}>)`).join('\n') || 'Üye bulunamadı.'))
            .setFooter({ text: 'Tendo League Kayıt Sistemi' });

        return message.channel.send({ embeds: [embed] });
    }

    // Antrenman (.ant)
    if (command === '.ant' || command === '.antrenman') {
        const data = getPlayerData(message.author.id, message.author.username);
        const now = Date.now();

        if (now < data.antCd) {
            const remaining = Math.ceil((data.antCd - now) / (1000 * 60));
            return message.reply(`⏳ Bekleme süresindesin! **${remaining} dk** sonra dene.`);
        }

        data.antCount = (data.antCount % 10) + 1;
        data.antCd = now + (60 * 60 * 1000);

        let rewardText = '';
        if (data.antCount === 10) {
            data.value += 3.0;
            rewardText = '\n\n🎉 **TEBRİKLER!** 10 seans bitti: **+3M€** kazandın!';
        }

        const progressBar = '🟩'.repeat(Math.min(data.antCount, 5)) + '⬜'.repeat(Math.max(0, 5 - data.antCount));

        const embed = new EmbedBuilder()
            .setTitle('⚽ ANTRENMAN TAKİBİ')
            .setThumbnail(message.author.displayAvatarURL())
            .setColor('#43b581')
            .setDescription(`**${message.author.username}**, antrenman sisteme işlendi!\n\n` +
                `${progressBar}\n\n` +
                `• **İlerleme:** ${data.antCount}/10 Seans${rewardText}`)
            .setFooter({ text: 'Tendo Performance Center' });

        return message.channel.send({ embeds: [embed] });
    }

    // Penaltı (.pen)
    if (command === '.pen' || command === '.kaleci') {
        const data = getPlayerData(message.author.id, message.author.username);
        const now = Date.now();

        if (now < data.penCd) {
            const remaining = Math.ceil((data.penCd - now) / (1000 * 60));
            return message.reply(`⏳ Penaltı sahası dolu! **${remaining} dk** bekle.`);
        }

        data.penCd = now + (2 * 60 * 60 * 1000);
        const isGoal = Math.random() < 0.5;

        if (command === '.pen') {
            if (isGoal) {
                data.value += 1.5;
                const embed = new EmbedBuilder()
                    .setTitle('⚽ GOOOOOOLLLL!')
                    .setColor('#43b581')
                    .setDescription(`Harika bir vuruş! Top ağlarda!\n\n🚀 **Kazanılan Değer:** +1.5M€\n💰 **Güncel Değer:** ${data.value.toFixed(1)}M€`);
                return message.channel.send({ embeds: [embed] });
            } else {
                const embed = new EmbedBuilder()
                    .setTitle('🧤 KALECİ KURTARDI!')
                    .setColor('#f04747')
                    .setDescription(`Kaleci çıkardı!\n\n💰 **Güncel Değer:** ${data.value.toFixed(1)}M€`);
                return message.channel.send({ embeds: [embed] });
            }
        }
    }

    // Futbol Bilmecesi (.ftbilmece)
    if (command === '.ftbilmece') {
        const questions = [
            { q: 'AC Milan\'ın 3 numaralı forması emekli edilen efsane stoper kimdir?', a: 'maldini' },
            { q: 'Tottenham\'dan Bayern Münih\'e transfer olan İngiliz santrfor kimdir?', a: 'harry kane' }
        ];

        const selected = questions[Math.floor(Math.random() * questions.length)];
        activeQuizzes.set(message.channel.id, { answer: selected.a });

        const embed = new EmbedBuilder()
            .setTitle('⚽ Futbol Bilmecesi')
            .setColor('#2b2d31')
            .addFields(
                { name: 'Soru:', value: selected.q },
                { name: '⏰ Süre:', value: '30 Saniye' }
            );

        return message.channel.send({ embeds: [embed] });
    }

    if (activeQuizzes.has(message.channel.id)) {
        const quiz = activeQuizzes.get(message.channel.id);
        if (message.content.toLowerCase().trim() === quiz.answer) {
            activeQuizzes.delete(message.channel.id);
            const data = getPlayerData(message.author.id, message.author.username);
            data.value += 2.0;

            const embed = new EmbedBuilder()
                .setTitle('🎉 TEBRİKLER!')
                .setColor('#43b581')
                .setDescription(`Tebrikler <@${message.author.id}>, doğru cevap!\n✅ **Cevap:** ${quiz.answer.toUpperCase()}\n💰 **Ödül:** +2.0M€ Değer`);
            return message.channel.send({ embeds: [embed] });
        }
    }

    // Yetkili Değer Verme (.dver @kullanici <miktar> <sebep>)
    if (command === '.dver') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
        const target = message.mentions.members.first();
        if (!target) return message.reply('❌ Bir üye etiketle.');

        const amount = parseFloat(args[2]);
        const reason = args.slice(3).join(' ') || 'Lig Yetkili Kararı';

        if (isNaN(amount)) return message.reply('❌ Geçerli bir miktar gir.');

        const data = getPlayerData(target.id, target.displayName);
        data.value += amount;

        const embed = new EmbedBuilder()
            .setColor('#43b581')
            .setDescription(`✅ **${target.displayName}** üyesine **${reason}** sebebiyle **+${amount}M€** eklendi!\nGüncel Değer: **${data.value.toFixed(1)}M€**`);

        return message.channel.send({ embeds: [embed] });
    }

    // Maç Sonu Özeti (!macsonu)
    if (command === '!macsonu' || command === '!macyap') {
        const embed = new EmbedBuilder()
            .setTitle('🏟️ MAÇ SONA ERDİ')
            .setColor('#2b2d31')
            .setDescription(
                '⚽ **Real Madrid  1 - 4  Barcelona** 🏆\n' +
                '🏆 **Barcelona** kazandı!\n----------------------------------------\n' +
                '11\' ⚽ **D.Núñez** | 🇺🇾 | SNT | 200M€\n' +
                '36\' ⚽ **D.Núñez** | 🇺🇾 | SNT | 200M€ ⬅️ 🅰️ **Joao Neves** | 🇵🇹 | OS | 200M€\n' +
                '51\' ⚽ **D.Núñez** | 🇺🇾 | SNT | 200M€\n' +
                '74\' ⚽ **Tchouaméni** | 🇫🇷 | DOS | 200M€\n' +
                '89\' ⚽ **B.Šeško** | 🇸🇮 | SNT | 109.5M€ ⬅️ 🅰️ **Hagi** | 🇷🇴 | OOS | 150M€\n----------------------------------------\n\n' +
                '📊 **Maç İstatistikleri**\n' +
                '⚡ **Topla Oynama %**\n🟦🟦🟦🟦🟦🟦🟥🟥🟥🟥🟥 (53 - 47)\n\n' +
                '💥 **Şut:** 6 - 11 | 🎯 **İsabetli:** 4 - 5 | 🚩 **Korner:** 1 - 6\n\n' +
                '🎯 **Taktik Etkisi**\n' +
                '⚔️ Ofansif • 🔺 Yüksek Pres vs 🧱 Ultra Defansif • Orta Blok\n\n' +
                '⭐ **MAÇIN ADAMI**\n' +
                '🌟 **D.Núñez** | 🇺🇾 | SNT | 200M€ — **10.0**\n' +
                '⚽ 3 gol • 💥 9 şut • 🌀 3 çalım • 🛡️ 3 top kapma'
            )
            .setFooter({ text: 'Real Madrid 951.1M • Barcelona 780.3M' });

        return message.channel.send({ embeds: [embed] });
    }

    // Taktik Menüsü (!taktik)
    if (command === '!taktik') {
        const embed = new EmbedBuilder()
            .setTitle('🎯 TAKTİK - Real Madrid')
            .setColor('#2b2d31')
            .setDescription(
                '🎯 **Mentalite:** ⚔️ Ofansif\n' +
                '🏃 **Pres:** 🔺 Yüksek Pres\n' +
                '⚡ **Tempo:** 📐 Kısa Pas'
            );

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_mentalite').setLabel('Ofansif').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('btn_pres').setLabel('Yüksek Pres').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('btn_tempo').setLabel('Kısa Pas').setStyle(ButtonStyle.Secondary)
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_kadro').setLabel('Kadroya Dön').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('btn_bitir').setLabel('Bitir').setStyle(ButtonStyle.Success)
        );

        return message.channel.send({ embeds: [embed], components: [row1, row2] });
    }
});

// ==========================================
// 4. MODAL VEYA BUTON ETKİLEŞİMLERİ
// ==========================================
client.on('interactionCreate', async (interaction) => {
    if (interaction.isButton() && interaction.customId === 'btn_basvur') {
        const modal = new ModalBuilder()
            .setCustomId('modal_basvuru')
            .setTitle('Yetkili Başvuru Formu');

        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('input_age').setLabel('Yaşınız kaç?').setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('input_reason').setLabel('Neden yetkili olmak istiyorsunuz?').setStyle(TextInputStyle.Paragraph).setRequired(true))
        );

        await interaction.showModal(modal);
    }
});

client.login(process.env.TOKEN);
