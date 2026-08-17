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

// Web Sunucusu (7/24 Uptime)
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Tendo League Mega Altyapı 7/24 Aktif!');
}).listen(process.env.PORT || 3000);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates
    ]
});

const playerData = new Map();
const clubData = new Map();

function getPlayer(id, username) {
    if (!playerData.has(id)) {
        playerData.set(id, { name: username, team: 'Serbest', role: 'Kayıtsız', value: 20.0, antCount: 0, antCd: 0, penCd: 0 });
    }
    return playerData.get(id);
}

client.on('ready', () => {
    console.log(`🤖 ${client.user.tag} Dev Kadro ve Kanal Sistemiyle Aktif!`);
});

// Otomatik Kayıtsız Rolü
client.on('guildMemberAdd', async (member) => {
    try {
        const unregRole = member.guild.roles.cache.find(r => r.name === 'Kayıtsız');
        if (unregRole) await member.roles.add(unregRole);
    } catch (e) {
        console.error('Rol verme hatası:', e);
    }
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const args = message.content.trim().split(/ +/);
    const command = args[0].toLowerCase();

    // ==========================================
    // 1. TAM OTOMATİK DEV KURULUM (.kur)
    // ==========================================
    if (command === '.kur') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ Bu komutu sadece **Yöneticiler** kullanabilir!');
        }

        const statusMsg = await message.channel.send('⏳ **Eski kanallar siliniyor, dev lig altyapısı ve izinleri kuruluyor...**');

        try {
            // A) ESKİ KANALLARI SİLME
            const existingChannels = await message.guild.channels.fetch();
            for (const [id, ch] of existingChannels) {
                if (ch && ch.deletable && ch.id !== message.channel.id) {
                    await ch.delete().catch(() => {});
                }
            }

            // B) ROLLERİ OLUŞTURMA
            const unregRole = await message.guild.roles.create({ name: 'Kayıtsız', color: '#808080' });
            const playerRole = await message.guild.roles.create({ name: 'Futbolcu', color: '#1abc9c' });
            const tdRole = await message.guild.roles.create({ name: 'Teknik Direktör', color: '#e67e22' });
            const regAuthRole = await message.guild.roles.create({ name: 'Kayıt Yetkilisi', color: '#3498db' });
            const valAuthRole = await message.guild.roles.create({ name: 'Değer Yetkilisi', color: '#f1c40f' });
            const adminRole = await message.guild.roles.create({ name: 'Lig Yönetimi', color: '#e74c3c' });

            // C) KANAL İZİN YAPISI (Permission Overwrites)
            // Kayıtsızlar Sadece Kayıt Kanalını Görsün, Diğerlerini Göremesin
            const denyUnregistered = [
                { id: message.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: unregRole.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: playerRole.id, allow: [PermissionFlagsBits.ViewChannel] },
                { id: tdRole.id, allow: [PermissionFlagsBits.ViewChannel] }
            ];

            const allowOnlyUnregistered = [
                { id: message.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: unregRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                { id: regAuthRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
            ];

            // D) KATEGORİLER VE BOL KANALLAR
            // 1. BİLGİ VE BÜLTEN
            const catInfo = await message.guild.channels.create({ name: '📢 BİLGİLENDİRME', type: ChannelType.GuildCategory, permissionOverwrites: denyUnregistered });
            await message.guild.channels.create({ name: '📢・duyurular', type: ChannelType.GuildText, parent: catInfo.id });
            await message.guild.channels.create({ name: '📜・kurallar', type: ChannelType.GuildText, parent: catInfo.id });
            await message.guild.channels.create({ name: '📚・sistemler', type: ChannelType.GuildText, parent: catInfo.id });
            await message.guild.channels.create({ name: '🚀・booster-özel', type: ChannelType.GuildText, parent: catInfo.id });

            // 2. LİSANS VE KAYIT ŞEHRİ
            const catReg = await message.guild.channels.create({ name: '📝 LİSANS VE KAYIT', type: ChannelType.GuildCategory });
            const chKayit = await message.guild.channels.create({ name: '📝・kayıt-şehri', type: ChannelType.GuildText, parent: catReg.id, permissionOverwrites: allowOnlyUnregistered });
            await message.guild.channels.create({ name: '📋・kayıt-log', type: ChannelType.GuildText, parent: catReg.id, permissionOverwrites: denyUnregistered });

            // 3. SOYUNMA ODASI VE TOPLULUK
            const catGen = await message.guild.channels.create({ name: '💬 SOYUNMA ODASI', type: ChannelType.GuildCategory, permissionOverwrites: denyUnregistered });
            await message.guild.channels.create({ name: '💬・genel-sohbet', type: ChannelType.GuildText, parent: catGen.id });
            await message.guild.channels.create({ name: '🤖・bot-komut', type: ChannelType.GuildText, parent: catGen.id });
            await message.guild.channels.create({ name: '🎮・eğlence', type: ChannelType.GuildText, parent: catGen.id });
            await message.guild.channels.create({ name: '📸・medya-paylaşım', type: ChannelType.GuildText, parent: catGen.id });

            // 4. LİG VE PERFORMANS SAHASI
            const catLeague = await message.guild.channels.create({ name: '🏆 LİG BÖLGESİ', type: ChannelType.GuildCategory, permissionOverwrites: denyUnregistered });
            const chAntrenman = await message.guild.channels.create({ name: '🏋️・antrenman', type: ChannelType.GuildText, parent: catLeague.id, rateLimitPerUser: 3600 });
            const chPenalti = await message.guild.channels.create({ name: '⚽・penaltı-sahası', type: ChannelType.GuildText, parent: catLeague.id });
            await message.guild.channels.create({ name: '🏟️・maç-sahası', type: ChannelType.GuildText, parent: catLeague.id });
            await message.guild.channels.create({ name: '📅・fikstür-takvim', type: ChannelType.GuildText, parent: catLeague.id });
            await message.guild.channels.create({ name: '📊・puan-durumu', type: ChannelType.GuildText, parent: catLeague.id });
            await message.guild.channels.create({ name: '🌧️・hava-durumu', type: ChannelType.GuildText, parent: catLeague.id });

            // 5. BORSASI VE TRANSFER
            const catTransfer = await message.guild.channels.create({ name: '🔄 TRANSFER BORSASI', type: ChannelType.GuildCategory, permissionOverwrites: denyUnregistered });
            await message.guild.channels.create({ name: '🔁・transfer-duyuru', type: ChannelType.GuildText, parent: catTransfer.id });
            await message.guild.channels.create({ name: '💰・oyuncu-piyasası', type: ChannelType.GuildText, parent: catTransfer.id });
            await message.guild.channels.create({ name: '🤝・sponsor-anlaşmaları', type: ChannelType.GuildText, parent: catTransfer.id });

            // Kayıt Paneli Butonları
            const regEmbed = new EmbedBuilder()
                .setTitle('📝 Tendo League Lisans Başvurusu')
                .setColor('#2b2d31')
                .setDescription('Ligde oynamak için durumunuza uygun butona tıklayıp formu doldurun. Başvurunuz **Kayıt Yetkilileri** tarafından incelenip onaylanacaktır.');

            const regRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('btn_reg_player').setLabel('Futbolcu Kaydı').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('btn_reg_td').setLabel('Teknik Direktör Kaydı').setStyle(ButtonStyle.Primary)
            );

            await chKayit.send({ embeds: [regEmbed], components: [regRow] });

            return statusMsg.edit(`✅ **DEV LİG ALTYAPISI BAŞARIYLA KURULDU!**\n\n• **Temizlenen Kanallar:** Hepsi sıfırlandı!\n• **Kanal İzinleri:** Kayıtsız kişilerin diğer kanalları görmesi engellendi.\n• **Roller:** ${unregRole}, ${playerRole}, ${tdRole}, ${regAuthRole}, ${valAuthRole}\n• **Antrenman:** ${chAntrenman} *(1 Saat Yavaş Mod)*\n• **Penaltı Sahası:** ${chPenalti}`);
        } catch (err) {
            console.error(err);
            return statusMsg.edit('❌ Kurulum sırasında bir hata oluştu!');
        }
    }

    // ==========================================
    // 2. YETKİLİ ÖZEL KAYIT KONTROLÜ (.kaydet)
    // ==========================================
    if (command === '.kaydet') {
        // Sadece Kayıt Yetkilisi Kullanabilir
        if (!message.member.roles.cache.some(r => r.name === 'Kayıt Yetkilisi') && !message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ Bu komutu sadece **Kayıt Yetkilisi** rolüne sahip kişiler kullanabilir!');
        }

        const target = message.mentions.members.first();
        if (!target) return message.reply('❌ Bir üye etiketlemelisiniz! Örn: `.kaydet @üye Futbolcu`');

        const roleType = args[2] ? args[2].toLowerCase() : '';
        const unregRole = message.guild.roles.cache.find(r => r.name === 'Kayıtsız');

        if (roleType === 'futbolcu') {
            const pRole = message.guild.roles.cache.find(r => r.name === 'Futbolcu');
            if (unregRole) await target.roles.remove(unregRole);
            if (pRole) await target.roles.add(pRole);
            return message.channel.send(`✅ **${target.displayName}** başarıyla **Futbolcu** olarak kaydedildi! Kayıtsız rolü alındı.`);
        } else if (roleType === 'td' || roleType === 'teknik') {
            const tdRole = message.guild.roles.cache.find(r => r.name === 'Teknik Direktör');
            if (unregRole) await target.roles.remove(unregRole);
            if (tdRole) await target.roles.add(tdRole);
            return message.channel.send(`✅ **${target.displayName}** başarıyla **Teknik Direktör** olarak kaydedildi! Kayıtsız rolü alındı.`);
        } else {
            return message.reply('❌ Geçerli bir rol girin! Kullanım: `.kaydet @üye Futbolcu` veya `.kaydet @üye TD`');
        }
    }

    // ==========================================
    // 3. YETKİLİ DEĞER VERME (.dver)
    // ==========================================
    if (command === '.dver') {
        // Sadece Değer Yetkilisi Kullanabilir
        if (!message.member.roles.cache.some(r => r.name === 'Değer Yetkilisi') && !message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ Bu komutu sadece **Değer Yetkilisi** rolüne sahip kişiler kullanabilir!');
        }

        const target = message.mentions.members.first();
        if (!target) return message.reply('❌ Bir üye etiketleyin!');

        const amount = parseFloat(args[2]);
        const reason = args.slice(3).join(' ') || 'Performans Güncellemesi';

        if (isNaN(amount)) return message.reply('❌ Geçerli bir miktar girin!');

        const p = getPlayer(target.id, target.displayName);
        p.value += amount;

        const embed = new EmbedBuilder()
            .setColor('#f1c40f')
            .setDescription(`💰 **${target.displayName}** oyuncusuna **${reason}** sebebiyle **+${amount}M€** değer eklendi!\nGüncel Değer: **${p.value.toFixed(1)}M€**`);

        return message.channel.send({ embeds: [embed] });
    }

    // ==========================================
    // 4. KANAL KISITLAMALI KOMUTLAR
    // ==========================================

    // Antrenman (Sadece #🏋️・antrenman kanalında)
    if (command === '.ant' || command === '.antrenman') {
        if (!message.channel.name.includes('antrenman')) {
            return message.reply('❌ Antrenman komutu sadece **#🏋️・antrenman** kanalında kullanılabilir!');
        }

        const p = getPlayer(message.author.id, message.author.username);
        const now = Date.now();

        if (now < p.antCd) {
            const rem = Math.ceil((p.antCd - now) / 60000);
            return message.reply(`⏳ Yavaş mod aktif! **${rem} dk** sonra tekrar deneyebilirsin.`);
        }

        p.antCount = (p.antCount % 10) + 1;
        p.antCd = now + 3600000;

        let rewardText = '';
        if (p.antCount === 10) {
            p.value += 3.0;
            rewardText = '\n\n🎉 **TEBRİKLER!** 10 seans bitti: **+3M€ Değer** kazandın!';
        }

        const bar = '🟩'.repeat(Math.min(p.antCount, 5)) + '⬜'.repeat(Math.max(0, 5 - p.antCount));

        const embed = new EmbedBuilder()
            .setTitle('⚽ ANTRENMAN SEANSI')
            .setColor('#43b581')
            .setDescription(`**${message.author.username}**, antrenman işlendi!\n\n${bar}\n\nİlerleme: **${p.antCount}/10**${rewardText}`);

        return message.channel.send({ embeds: [embed] });
    }

    // Penaltı ve Kaleci (Sadece #⚽・penaltı-sahası kanalında)
    if (command === '.pen' || command === '.kaleci') {
        if (!message.channel.name.includes('penaltı')) {
            return message.reply('❌ Penaltı komutları sadece **#⚽・penaltı-sahası** kanalında kullanılabilir!');
        }

        const p = getPlayer(message.author.id, message.author.username);
        const now = Date.now();

        if (now < p.penCd) {
            const rem = Math.ceil((p.penCd - now) / 60000);
            return message.reply(`⏳ Penaltı sahası dolu! **${rem} dk** bekle.`);
        }

        p.penCd = now + (2 * 60 * 60 * 1000);
        const isGoal = Math.random() < 0.5;

        if (isGoal) {
            p.value += 1.5;
            return message.channel.send({ embeds: [new EmbedBuilder().setTitle('⚽ GOOOOOOLLLL!').setColor('#43b581').setDescription(`Top ağlarla buluştu!\n🚀 **Kazanılan Değer:** +1.5M€\n💰 **Güncel Değer:** ${p.value.toFixed(1)}M€`)] });
        } else {
            return message.channel.send({ embeds: [new EmbedBuilder().setTitle('🧤 KALECİ KURTARDI!').setColor('#f04747').setDescription(`Top kalecide kaldı!\n💰 **Güncel Değer:** ${p.value.toFixed(1)}M€`)] });
        }
    }

    // Maç Sonu Kartı
    if (command === '!macsonu') {
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
                '⭐ **MAÇIN ADAMI**\n' +
                '🌟 **D.Núñez** | 🇺🇾 | SNT | 200M€ — **10.0**'
            );

        return message.channel.send({ embeds: [embed] });
    }

    // Taktik
    if (command === '!taktik') {
        const embed = new EmbedBuilder()
            .setTitle('🎯 TAKTİK PANENLİ')
            .setColor('#2b2d31')
            .setDescription('🎯 **Mentalite:** ⚔️ Ofansif\n🏃 **Pres:** 🔺 Yüksek Pres\n⚡ **Tempo:** 📐 Kısa Pas');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_m').setLabel('Ofansif').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('btn_p').setLabel('Yüksek Pres').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('btn_t').setLabel('Kısa Pas').setStyle(ButtonStyle.Secondary)
        );

        return message.channel.send({ embeds: [embed], components: [row] });
    }
});

// ==========================================
// 5. MODAL KAYIT VE BUTON İŞLEMLERİ
// ==========================================
client.on('interactionCreate', async (interaction) => {
    try {
        if (interaction.isButton()) {
            // Futbolcu Modal Açma (İsim | Ülke | Değer)
            if (interaction.customId === 'btn_reg_player') {
                const modal = new ModalBuilder().setCustomId('modal_reg_player').setTitle('Futbolcu Lisans Formu');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('p_name').setLabel('İsim').setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('p_country').setLabel('Ülke').setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('p_val').setLabel('Piyasa Değeri (M€)').setStyle(TextInputStyle.Short).setRequired(true))
                );
                return await interaction.showModal(modal);
            }

            // TD Modal Açma (İsim | Ülke | Yaş | Kupa Sayısı)
            if (interaction.customId === 'btn_reg_td') {
                const modal = new ModalBuilder().setCustomId('modal_reg_td').setTitle('Teknik Direktör Sözleşme Formu');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('td_name').setLabel('İsim').setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('td_country').setLabel('Ülke').setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('td_age').setLabel('Yaş').setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('td_trophy').setLabel('Kupa Sayısı').setStyle(TextInputStyle.Short).setRequired(true))
                );
                return await interaction.showModal(modal);
            }
        }

        // MODAL FORM GÖNDERİMLERİ (Kayıt Loguna İletme)
        if (interaction.type === InteractionType.ModalSubmit) {
            const logCh = interaction.guild.channels.cache.find(c => c.name.includes('kayıt-log'));

            if (interaction.customId === 'modal_reg_player') {
                const name = interaction.fields.getTextInputValue('p_name');
                const country = interaction.fields.getTextInputValue('p_country');
                const val = interaction.fields.getTextInputValue('p_val');

                const embed = new EmbedBuilder()
                    .setTitle('📋 Yeni Futbolcu Lisans Başvurusu')
                    .setColor('#1abc9c')
                    .setDescription(`**Başvuran:** <@${interaction.user.id}>\n\n**İsim:** ${name}\n**Ülke:** ${country}\n**Değeri:** ${val}M€\n\n*Onaylamak için:* \`.kaydet <@${interaction.user.id}> Futbolcu\``);

                if (logCh) await logCh.send({ embeds: [embed] });
                return await interaction.reply({ content: '✅ Futbolcu lisans başvurunuz Kayıt Yetkililerine iletildi!', ephemeral: true });
            }

            if (interaction.customId === 'modal_reg_td') {
                const name = interaction.fields.getTextInputValue('td_name');
                const country = interaction.fields.getTextInputValue('td_country');
                const age = interaction.fields.getTextInputValue('td_age');
                const trophy = interaction.fields.getTextInputValue('td_trophy');

                const embed = new EmbedBuilder()
                    .setTitle('📋 Yeni T.D. Başvurusu')
                    .setColor('#e67e22')
                    .setDescription(`**Başvuran:** <@${interaction.user.id}>\n\n**İsim:** ${name}\n**Ülke:** ${country}\n**Yaş:** ${age}\n**Kupa Sayısı:** ${trophy}\n\n*Onaylamak için:* \`.kaydet <@${interaction.user.id}> TD\``);

                if (logCh) await logCh.send({ embeds: [embed] });
                return await interaction.reply({ content: '✅ Teknik Direktör başvurunuz Kayıt Yetkililerine iletildi!', ephemeral: true });
            }
        }
    } catch (err) {
        console.error('Etkileşim Hatası:', err);
    }
});

client.login(process.env.TOKEN);
