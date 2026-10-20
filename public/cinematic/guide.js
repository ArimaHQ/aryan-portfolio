/* ARIMA Journey guide: an automated, speaking guide at the end of the Journey.
   Answers come only from this page's approved content (window.ARIMA and the Journey text).
   Voice and microphone start only after the visitor chooses them. The access-request flow
   asks one question at a time, shows a summary, and sends only after explicit confirmation. */
(function () {
  'use strict';
  const A = window.ARIMA;
  const app = document.getElementById('guideApp');
  if (!A || !app) return;

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const log = $('gLog'), chips = $('gChips'), form = $('gForm'), input = $('gInput'), email = $('gEmail');
  const portal = $('gPortal'), summary = $('gSummary'), err = $('gErr'), hint = $('gHint'), stateLine = $('gState');

  /* ------------------------------------------------------------------ strings */
  const T = {
    en: {
      name: 'ARIMA Guide', automated: 'Automated guide', voiceOn: 'Turn on voice', voiceOff: 'Voice on', mute: 'Mute', unmute: 'Unmute',
      replay: 'Replay', speak: 'Speak', stop: 'Stop listening', send: 'Send', next: 'Next', cancel: 'Cancel request', askLabel: 'Ask a question',
      askPh: 'Ask about ARIMA', emailLabel: 'Your email address',
      speaking: 'Speaking…', listening: 'Listening…', idle: '',
      intro: 'Hello. I’m ARIMA’s automated guide, not a person. I answer from what this website says, so I won’t guess at prices, dates or account details. Ask me about the Journey, or I can help you request account access.',
      chipsChat: ['What is ARIMA?', 'What have I seen so far?', 'Who is the founder?', 'What do the status labels mean?'],
      chipRequest: 'Request account access',
      unknown: 'I don’t have an approved answer for that on this website, so I won’t guess. You could ask about a part of the Journey, the founder, or how to request access.',
      source: 'From this website’s Journey content.',
      price: 'This website doesn’t publish prices or fees, so I can’t quote any.',
      dates: 'This website doesn’t give release or launch dates. Each part of ARIMA shows its current status instead, such as “In development” or “Planned”.',
      accountStatus: 'I can’t see accounts or their status. If you’ve sent an access request, ARIMA will reply using the details you gave.',
      whoAmI: 'I’m ARIMA’s automated guide: software, not a person. I answer from this website’s approved content and can help you request account access.',
      visitedNone: 'You haven’t scrolled through any chapters yet. The Journey starts at the top of this page.',
      visited: (list) => `So far you’ve passed through: ${list}.`,
      statusIntro: 'Every part of ARIMA carries a status label:',
      contact: 'A public contact address isn’t published on this site yet. You can request account access here, or use the next steps above.',
      accessOffer: 'I can take an access request now. It’s four short questions, and it doesn’t create or approve an account by itself.',
      founderLead: (f) => `${f.name} is the ${f.role.toLowerCase().replace('arima', 'ARIMA')}.`,
      founderEdu: 'Education', founderExp: 'Experience', founderQual: 'Qualifications',
      routes: {
        portfolio: ['Client portfolio access is for authorised client workspaces only.', '/client-portfolio/', 'Open client portfolio'],
        film: ['The current cinematic ARIMA film is on its own page.', '/watch-intro/', 'Watch the film'],
        work: ['Volunteer, internship and future roles are on the Work with us page.', '/work-with-us/', 'Work with us'],
        research: ['The public research pages are opening in stages.', '/research-projects/', 'Research projects'],
        lab: ['The Portfolio Lab has its own pages on the main site.', '/portfolio-lab/', 'Portfolio lab'],
        main: ['You can go back to the main ARIMA site at any time.', '/', 'Main site'],
      },
      // access request
      reqStart: 'Let’s request access. I’ll ask one thing at a time, and you can change any answer before sending.',
      q: {
        firstName: 'What’s your first name?',
        lastName: 'And your last name?',
        email: 'What email address should ARIMA reply to? I’ve opened a portal for it.',
        phone: 'Last one: your telephone number, starting with + and your country code. For example +44 20 7946 0000.',
      },
      ph: { firstName: 'First name', lastName: 'Last name', email: 'name@example.com', phone: '+44 20 7946 0000' },
      bad: {
        firstName: 'Please type your first name using letters only.',
        lastName: 'Please type your last name using letters only.',
        email: 'That doesn’t look like an email address. Please check it, for example name@example.com.',
        phone: 'Please include + and your country code, then the number. For example +44 20 7946 0000.',
      },
      fmtNote: 'I check the format only. I can’t confirm that the address or number belongs to you.',
      ack: { firstName: (v) => `Thank you, ${v}.`, lastName: () => 'Got it.', email: () => 'Thanks.', phone: () => 'Thank you.' },
      labels: { firstName: 'First name', lastName: 'Last name', email: 'Email', phone: 'Telephone' },
      edit: 'Edit', summaryTitle: 'Please check your details',
      privacy: (days) => `These details will be sent to ARIMA to handle your access request. They are stored securely for up to ${days} days and used only to respond to this request. Sending them is a request, not account approval or creation.`,
      consent: 'I confirm these details are correct and agree to send them to ARIMA.',
      confirmSend: 'Confirm and send', sending: 'Sending…',
      needConsent: 'Please tick the box to confirm before sending.',
      summaryReady: 'Here’s a summary. Check it, edit anything, and send when you’re ready.',
      recorded: (ref) => `Your request is recorded. Your reference is ${ref}.`,
      emailAccepted: 'It has been handed to ARIMA’s email service. ARIMA will review it and reply to the email you gave; this isn’t account approval.',
      emailQueued: 'Emailing ARIMA didn’t go through yet, so it will be retried automatically. Your request is safely stored.',
      emailOff: 'Email notification to ARIMA isn’t switched on yet, so your request is stored and will be sent once it is.',
      duplicate: 'This request was already recorded, so nothing new was sent.',
      storageOff: 'Requests can’t be recorded on this website yet, so nothing was sent. Please try again later.',
      failed: 'I couldn’t reach ARIMA, so your request was not confirmed. Your answers are still here; please try again.',
      rateLimited: 'Too many requests have come from this connection recently. Please try again in an hour.',
      cancelled: 'No problem, I’ve cancelled the request and nothing was sent.',
      editNow: (label) => `Sure. Please type your ${label.toLowerCase()} again.`,
      noVoice: 'This browser has no built-in voice, so I’ll answer in text.',
      noFaVoice: 'This device has no Persian voice, so I’ll answer Persian in text only.',
      voiceReady: 'Voice is on. You can mute or replay at any time.',
      micBlocked: 'The microphone wasn’t allowed, so please type instead.',
      micNone: 'Speech input isn’t available in this browser, so please type.',
      heard: 'I heard:',
    },
    fa: {
      name: 'راهنمای آریما', automated: 'راهنمای خودکار', voiceOn: 'روشن کردن صدا', voiceOff: 'صدا روشن است', mute: 'بی‌صدا', unmute: 'صدادار',
      replay: 'پخش دوباره', speak: 'صحبت کنید', stop: 'توقف شنیدن', send: 'ارسال', next: 'بعدی', cancel: 'لغو درخواست', askLabel: 'سؤال خود را بنویسید',
      askPh: 'درباره آریما بپرسید', emailLabel: 'نشانی ایمیل شما',
      speaking: 'در حال صحبت…', listening: 'در حال شنیدن…', idle: '',
      intro: 'سلام. من راهنمای خودکار آریما هستم، نه یک انسان. پاسخ‌هایم فقط از محتوای همین وب‌سایت است، پس درباره قیمت، تاریخ یا وضعیت حساب حدس نمی‌زنم. درباره سفر آریما بپرسید، یا می‌توانم در درخواست دسترسی به حساب کمکتان کنم.',
      chipsChat: ['آریما چیست؟', 'تا اینجا چه دیده‌ام؟', 'بنیان‌گذار کیست؟', 'برچسب‌های وضعیت یعنی چه؟'],
      chipRequest: 'درخواست دسترسی به حساب',
      unknown: 'برای این سؤال پاسخ تأییدشده‌ای در این وب‌سایت ندارم و حدس نمی‌زنم. می‌توانید درباره یکی از بخش‌های سفر، بنیان‌گذار یا درخواست دسترسی بپرسید.',
      source: 'متن اصلی این بخش در سایت به انگلیسی است.',
      price: 'این وب‌سایت قیمت یا هزینه‌ای منتشر نکرده است، پس نمی‌توانم رقمی بگویم.',
      dates: 'این وب‌سایت تاریخ انتشار یا راه‌اندازی اعلام نکرده است. به‌جای آن، هر بخش آریما وضعیت فعلی‌اش را نشان می‌دهد، مثل «در حال توسعه» یا «برنامه‌ریزی‌شده».',
      accountStatus: 'من به حساب‌ها و وضعیت آن‌ها دسترسی ندارم. اگر درخواست دسترسی فرستاده‌اید، آریما از طریق اطلاعاتی که داده‌اید پاسخ می‌دهد.',
      whoAmI: 'من راهنمای خودکار آریما هستم: یک نرم‌افزار، نه یک انسان. فقط از محتوای تأییدشده این وب‌سایت پاسخ می‌دهم و می‌توانم در درخواست دسترسی کمک کنم.',
      visitedNone: 'هنوز از هیچ فصلی عبور نکرده‌اید. سفر از بالای همین صفحه شروع می‌شود.',
      visited: (list) => `تا اینجا از این فصل‌ها گذشته‌اید: ${list}.`,
      statusIntro: 'هر بخش آریما یک برچسب وضعیت دارد:',
      contact: 'هنوز نشانی تماس عمومی در این سایت منتشر نشده است. می‌توانید همین‌جا درخواست دسترسی بفرستید یا از گام‌های بعدیِ بالای صفحه استفاده کنید.',
      accessOffer: 'می‌توانم همین حالا درخواست دسترسی شما را ثبت کنم. چهار سؤال کوتاه است و به‌تنهایی حسابی نمی‌سازد یا تأیید نمی‌کند.',
      founderLead: (f) => `${f.name} بنیان‌گذار آریما فایننس است.`,
      founderEdu: 'تحصیلات', founderExp: 'سوابق کاری', founderQual: 'مدارک',
      routes: {
        portfolio: ['دسترسی به پورتفولیوی مشتریان فقط برای فضاهای کاری مشتریان مجاز است.', '/client-portfolio/', 'ورود به پورتفولیوی مشتری'],
        film: ['فیلم سینمایی فعلی آریما صفحه جداگانه‌ای دارد.', '/watch-intro/', 'تماشای فیلم'],
        work: ['فرصت‌های داوطلبانه، کارآموزی و نقش‌های آینده در صفحه همکاری با ما هستند.', '/work-with-us/', 'همکاری با ما'],
        research: ['صفحه‌های پژوهشی عمومی به‌تدریج باز می‌شوند.', '/research-projects/', 'پروژه‌های پژوهشی'],
        lab: ['آزمایشگاه پورتفولیو صفحه‌های خودش را در سایت اصلی دارد.', '/portfolio-lab/', 'آزمایشگاه پورتفولیو'],
        main: ['هر زمان بخواهید می‌توانید به سایت اصلی آریما برگردید.', '/', 'سایت اصلی'],
      },
      reqStart: 'برای درخواست دسترسی، هر بار یک سؤال می‌پرسم و پیش از ارسال می‌توانید هر پاسخی را تغییر دهید.',
      q: {
        firstName: 'نام کوچک شما چیست؟',
        lastName: 'و نام خانوادگی‌تان؟',
        email: 'آریما به کدام نشانی ایمیل پاسخ دهد؟ دریچه‌ای برایش باز کرده‌ام.',
        phone: 'آخرین سؤال: شماره تلفن شما، با + و کد کشور. مثلاً ‎+98 912 345 6789‎.',
      },
      ph: { firstName: 'نام', lastName: 'نام خانوادگی', email: 'name@example.com', phone: '+98 912 345 6789' },
      bad: {
        firstName: 'لطفاً نام خود را فقط با حروف بنویسید.',
        lastName: 'لطفاً نام خانوادگی را فقط با حروف بنویسید.',
        email: 'این شبیه نشانی ایمیل نیست. لطفاً بررسی کنید، مثلاً name@example.com.',
        phone: 'لطفاً شماره را با + و کد کشور بنویسید، مثلاً ‎+98 912 345 6789‎.',
      },
      fmtNote: 'فقط قالب را بررسی می‌کنم و نمی‌توانم تأیید کنم که این نشانی یا شماره متعلق به شماست.',
      ack: { firstName: (v) => `ممنون، ${v}.`, lastName: () => 'ثبت شد.', email: () => 'ممنون.', phone: () => 'متشکرم.' },
      labels: { firstName: 'نام', lastName: 'نام خانوادگی', email: 'ایمیل', phone: 'تلفن' },
      edit: 'ویرایش', summaryTitle: 'لطفاً اطلاعات خود را بررسی کنید',
      privacy: (days) => `این اطلاعات برای رسیدگی به درخواست دسترسی شما به آریما فرستاده می‌شود. تا ${days} روز به‌صورت امن نگه‌داری می‌شود و فقط برای پاسخ به همین درخواست به کار می‌رود. ارسال آن یک درخواست است، نه تأیید یا ساخت حساب.`,
      consent: 'تأیید می‌کنم این اطلاعات درست است و با ارسال آن به آریما موافقم.',
      confirmSend: 'تأیید و ارسال', sending: 'در حال ارسال…',
      needConsent: 'لطفاً پیش از ارسال، گزینه تأیید را علامت بزنید.',
      summaryReady: 'این خلاصه اطلاعات شماست. بررسی کنید، هر مورد را که خواستید ویرایش کنید و سپس ارسال کنید.',
      recorded: (ref) => `درخواست شما ثبت شد. شماره پیگیری: ${ref}.`,
      emailAccepted: 'درخواست به سرویس ایمیل آریما تحویل داده شد. آریما آن را بررسی می‌کند و به ایمیل شما پاسخ می‌دهد؛ این به معنای تأیید حساب نیست.',
      emailQueued: 'ارسال ایمیل به آریما هنوز انجام نشده و به‌طور خودکار دوباره تلاش می‌شود. درخواست شما به‌صورت امن ذخیره شده است.',
      emailOff: 'ارسال ایمیل به آریما هنوز فعال نشده است؛ درخواست شما ذخیره شده و پس از فعال شدن فرستاده می‌شود.',
      duplicate: 'این درخواست قبلاً ثبت شده بود و چیز تازه‌ای فرستاده نشد.',
      storageOff: 'ثبت درخواست در این وب‌سایت هنوز فعال نیست، پس چیزی فرستاده نشد. لطفاً بعداً دوباره تلاش کنید.',
      failed: 'به آریما دسترسی پیدا نکردم و درخواست شما تأیید نشد. پاسخ‌هایتان سر جایشان هستند؛ لطفاً دوباره تلاش کنید.',
      rateLimited: 'از این اتصال به‌تازگی درخواست‌های زیادی آمده است. لطفاً یک ساعت دیگر دوباره تلاش کنید.',
      cancelled: 'باشه، درخواست لغو شد و چیزی فرستاده نشد.',
      editNow: (label) => `حتماً. لطفاً ${label} را دوباره بنویسید.`,
      noVoice: 'این مرورگر صدای داخلی ندارد، پس به‌صورت متنی پاسخ می‌دهم.',
      noFaVoice: 'این دستگاه صدای فارسی ندارد، پس پاسخ‌های فارسی را فقط به‌صورت متن می‌بینید.',
      voiceReady: 'صدا روشن شد. هر زمان بخواهید می‌توانید آن را بی‌صدا کنید یا دوباره پخش کنید.',
      micBlocked: 'اجازه استفاده از میکروفون داده نشد؛ لطفاً تایپ کنید.',
      micNone: 'ورودی صوتی در این مرورگر در دسترس نیست؛ لطفاً تایپ کنید.',
      heard: 'شنیدم:',
    },
  };
  let lang = 'en';
  const t = () => T[lang];

  /* ------------------------------------------------------------------ state */
  const FIELDS = ['firstName', 'lastName', 'email', 'phone'];
  const req = { active: false, step: -1, editing: null, answers: {}, startedAt: 0, submissionId: null, submitting: false, done: false };
  let status = { accessRequests: { storage: false, email: false, retentionDays: 180 }, speech: { server: false } };
  fetch('/api/guide/status', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((s) => { if (s) status = s; }).catch(() => {});

  /* chapters the visitor has scrolled through */
  const visited = new Set();
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) visited.add(e.target.id); }), { threshold: 0.3 });
    A.nav.forEach((n) => { const el = document.getElementById(n.id); if (el && n.id !== 'guide') io.observe(el); });
  }

  /* ------------------------------------------------------------------ voice */
  const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
  const voice = { on: false, muted: false, speaking: false, audio: null, last: null, level: 0 };
  function pickVoice(code) {
    if (!synth) return null;
    const voices = synth.getVoices().filter((v) => v.lang && v.lang.toLowerCase().startsWith(code));
    const rank = (v) => (/natural|neural|premium|enhanced/i.test(v.name) ? 4 : 0) + (/en-gb/i.test(v.lang) ? 2 : 0) + (/female|sonia|libby|serena|samantha|google uk/i.test(v.name) ? 1 : 0);
    return voices.sort((a, b) => rank(b) - rank(a))[0] || null;
  }
  function setSpeaking(on) {
    voice.speaking = on;
    stateLine.textContent = on ? t().speaking : '';
  }
  function stopSpeech() {
    if (synth) synth.cancel();
    if (voice.audio) { voice.audio.pause(); voice.audio = null; }
    setSpeaking(false);
  }
  async function speak(text, l, force) {
    voice.last = { text, lang: l };
    if (!voice.on || (voice.muted && !force)) return;
    stopSpeech();
    if (status.speech && status.speech.server) {
      try {
        const r = await fetch('/api/guide/speech', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: text.slice(0, 700), lang: l }) });
        if (r.ok) {
          const url = URL.createObjectURL(await r.blob());
          const audio = new Audio(url);
          voice.audio = audio;
          audio.onplay = () => setSpeaking(true);
          audio.onended = audio.onerror = () => { setSpeaking(false); URL.revokeObjectURL(url); };
          await audio.play();
          return;
        }
      } catch (e) { /* fall back to the browser voice */ }
    }
    if (!synth) return;
    const v = pickVoice(l === 'fa' ? 'fa' : 'en');
    if (!v && l === 'fa') return;
    const u = new SpeechSynthesisUtterance(text);
    if (v) u.voice = v;
    u.lang = l === 'fa' ? 'fa-IR' : (v ? v.lang : 'en-GB');
    u.rate = 0.97; u.pitch = 1.02;
    u.onstart = () => setSpeaking(true);
    u.onend = u.onerror = () => setSpeaking(false);
    u.onboundary = () => { voice.level = 1; };
    synth.speak(u);
  }
  function updateVoiceNote() {
    const note = $('gNote');
    if (!voice.on) { note.textContent = ''; return; }
    if (status.speech && status.speech.server) { note.textContent = ''; return; }
    if (!synth) note.textContent = t().noVoice;
    else if (lang === 'fa' && !pickVoice('fa')) note.textContent = t().noFaVoice;
    else note.textContent = '';
  }
  $('gVoice').addEventListener('click', () => {
    voice.on = !voice.on;
    if (!voice.on) stopSpeech();
    $('gVoice').setAttribute('aria-pressed', String(voice.on));
    $('gVoice').textContent = voice.on ? t().voiceOff : t().voiceOn;
    $('gMute').hidden = !voice.on;
    updateVoiceNote();
    if (voice.on) speak(voice.last ? voice.last.text : t().voiceReady, voice.last ? voice.last.lang : lang);
  });
  $('gMute').addEventListener('click', () => {
    voice.muted = !voice.muted;
    if (voice.muted) stopSpeech();
    $('gMute').setAttribute('aria-pressed', String(voice.muted));
    $('gMute').textContent = voice.muted ? t().unmute : t().mute;
  });
  $('gReplay').addEventListener('click', () => {
    if (!voice.last) return;
    if (!voice.on) $('gVoice').click();
    else speak(voice.last.text, voice.last.lang, true);
  });
  if (synth && synth.onvoiceschanged !== undefined) synth.onvoiceschanged = updateVoiceNote;

  /* microphone: only after the visitor presses Speak */
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null;
  if (Rec) $('gMic').hidden = false;
  $('gMic').addEventListener('click', () => {
    if (!Rec) { addMsg('g', esc(t().micNone)); return; }
    if (rec) { rec.stop(); return; }
    stopSpeech();
    rec = new Rec();
    rec.lang = lang === 'fa' ? 'fa-IR' : 'en-GB';
    rec.interimResults = false; rec.maxAlternatives = 1;
    $('gMic').textContent = t().stop; $('gMic').setAttribute('aria-pressed', 'true');
    stateLine.textContent = t().listening;
    rec.onresult = (e) => {
      const said = e.results[0] && e.results[0][0] ? e.results[0][0].transcript.trim() : '';
      if (!said) return;
      const field = activeField();
      if (field === 'email') email.value = said.replace(/\s+at\s+/i, '@').replace(/\s+dot\s+/gi, '.').replace(/\s+/g, '');
      else input.value = said;
      hint.textContent = `${t().heard} ${said}`;
    };
    rec.onerror = (e) => { if (e.error === 'not-allowed' || e.error === 'service-not-allowed') addMsg('g', esc(t().micBlocked)); };
    rec.onend = () => { rec = null; $('gMic').textContent = t().speak; $('gMic').setAttribute('aria-pressed', 'false'); stateLine.textContent = ''; };
    try { rec.start(); } catch (e) { rec = null; }
  });

  /* ------------------------------------------------------------------ conversation */
  function addMsg(who, html, opts = {}) {
    const li = document.createElement('li');
    li.className = who;
    li.innerHTML = html;
    if (opts.lang) { li.lang = opts.lang; li.dir = opts.lang === 'fa' ? 'rtl' : 'ltr'; }
    log.appendChild(li);
    log.scrollTop = log.scrollHeight;
    return li;
  }
  function say(text, extraHtml = '') {
    addMsg('g', esc(text) + extraHtml, { lang });
    speak(text, lang);
  }
  function renderChips() {
    chips.innerHTML = '';
    if (req.active) return;
    const add = (label, fn, key) => {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = label; if (key) b.className = 'key';
      b.addEventListener('click', fn); chips.appendChild(b);
    };
    add(t().chipRequest, startRequest, true);
    t().chipsChat.forEach((q) => add(q, () => ask(q)));
  }

  /* ------------------------------------------------------------------ grounded answers */
  const STOP = new Set('the a an and or of to in on for is are was what who how does do can i you me my your it this that with about tell more arima please there which where when why'.split(' '));
  const FA_ALIASES = [
    [/مغز|ذهن/, 'brain'], [/داده/, 'data engineering'], [/پژوهش|تحقیق|مدل/, 'research models'], [/دانشگاه|آموزش/, 'university'],
    [/صندوق|ای ?تی ?اف|etf/i, 'etf'], [/مینی ?اپ|تلگرام|هشدار/, 'mini app telegram alerts'], [/کسب ?و ?کار|شرکت/, 'businesses'],
    [/افراد|شخصی/, 'individuals'], [/دنیا|ورلد|جهان/, 'world'], [/موتور/, 'engine'], [/اجرا|معامله/, 'execution'],
    [/رفتار|بازار/, 'behaviour markets'], [/سیستم ?عامل|عملیات/, 'os operating'], [/وب ?سایت|سایت/, 'website'],
  ];
  const words = (s) => s.toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}\s-]/gu, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));
  const statusLabel = (k) => (A.statuses[k] ? A.statuses[k].label : k);
  const ltr = (html) => `<span dir="ltr" lang="en">${html}</span>`;

  function bestPlatform(q) {
    let text = q;
    if (lang === 'fa' || /[؀-ۿ]/.test(q)) FA_ALIASES.forEach(([re, en]) => { if (re.test(q)) text += ' ' + en; });
    const qw = words(text);
    if (!qw.length) return null;
    let best = null, bestScore = 0;
    A.platforms.forEach((p) => {
      const name = words(p.name + ' ' + p.id);
      const body = words([p.what, p.who, p.problem, p.produces].join(' '));
      let score = 0;
      qw.forEach((w) => {
        if (name.some((n) => n === w || (w.length > 4 && n.startsWith(w.slice(0, 5))))) score += 3;
        else if (body.includes(w)) score += 1;
      });
      if (score > bestScore) { best = p; bestScore = score; }
    });
    return bestScore >= 3 ? best : null;
  }

  function answer(q) {
    const s = q.toLowerCase();
    const has = (re) => re.test(s);
    const L = t();
    if (has(/request|access|account|sign ?up|register|join|apply|حساب|دسترسی|ثبت ?نام|عضویت|درخواست/) && !has(/status|وضعیت|my account|حساب من/)) {
      say(L.accessOffer); chips.innerHTML = ''; const b = document.createElement('button'); b.type = 'button'; b.className = 'key'; b.textContent = L.chipRequest; b.onclick = startRequest; chips.appendChild(b); return;
    }
    if (has(/price|pricing|cost|fee|how much|subscription|قیمت|هزینه|تعرفه|اشتراک|چقدر/)) return say(L.price);
    if (has(/when .*(launch|release|available|ready)|release date|launch date|roadmap|کی .*(منتشر|راه|آماده)|تاریخ/)) return say(L.dates);
    if (has(/status of my|my account|approved|حساب من|وضعیت درخواست|تأیید شد/)) return say(L.accountStatus);
    if (has(/who are you|what are you|are you (a )?(human|real|person|bot|robot|ai)|تو کی|کی هستی|چه کسی هستی|ربات|انسان/)) return say(L.whoAmI);
    if (has(/visited|seen|so far|where have i|chapters?|دیده|دیدم|فصل|تا اینجا/)) {
      const list = A.nav.filter((n) => visited.has(n.id)).map((n) => n.label);
      if (!list.length) return say(L.visitedNone);
      addMsg('g', esc(L.visited('\u2066' + list.join(', ') + '\u2069')), { lang });
      speak(L.visited(list.join(', ')), lang);
      return;
    }
    if (has(/founder|aryan|heidari|who (built|founded|runs|started)|بنیان|موسس|مؤسس|آرین|حیدری/)) {
      const f = A.founder;
      const edu = f.education.map((e) => esc(e.degree) + (e.place ? `, ${esc(e.place)}` : '')).join('; ');
      const exp = f.environments.map((e) => `${esc(e.org)}: ${esc(e.area)}`).join('; ');
      const qual = (f.qualifications || []).map(esc).join('; ');
      addMsg('g', `${esc(L.founderLead(f))}<br><b>${esc(L.founderEdu)}:</b> ${ltr(edu)}<br><b>${esc(L.founderExp)}:</b> ${ltr(exp)}${qual ? `<br><b>${esc(L.founderQual)}:</b> ${ltr(qual)}` : ''}<span class="src">${esc(L.source)}</span>`, { lang });
      speak(`${L.founderLead(f)} ${lang === 'en' ? `${L.founderEdu}: ${f.education.map((e) => e.degree).join(', ')}. ${L.founderQual}: ${(f.qualifications || []).join(' ')}` : ''}`, lang);
      return;
    }
    if (has(/status|label|in development|planned|research concept|برچسب|وضعیت/)) {
      const items = Object.keys(A.statuses).map((k) => `<b>${esc(A.statuses[k].label)}</b>: ${esc(A.statuses[k].note)}`).join('<br>');
      addMsg('g', `${esc(L.statusIntro)}<br>${ltr(items)}`, { lang }); speak(L.statusIntro, lang); return;
    }
    if (has(/contact|email|phone|reach|get in touch|تماس|ارتباط/)) return say(L.contact);
    const route = has(/client|portfolio(?! lab)|login|sign in|پورتفولیو|مشتری|ورود/) ? 'portfolio'
      : has(/film|video|intro|watch|فیلم|ویدیو/) ? 'film'
      : has(/work with|career|job|intern|volunteer|همکاری|شغل|کارآموز/) ? 'work'
      : has(/portfolio lab|lab|آزمایشگاه/) ? 'lab'
      : has(/research project|publication|paper|پروژه/) ? 'research'
      : has(/main site|home|homepage|back|سایت اصلی|خانه|برگشت/) ? 'main' : null;
    if (route) { const [line, href, label] = L.routes[route]; say(line, ` <a href="${href}">${esc(label)}</a>`); return; }
    if (has(/what is arima|about arima|what does arima do|tell me about arima|آریما چیست|آریما چه|درباره آریما|آریما کیست/) || s.trim() === 'arima' || s.trim() === 'آریما') {
      const about = document.querySelector('#about .lead');
      const lead = document.querySelector('.hero .lead');
      const text = [lead && lead.textContent, about && about.textContent].filter(Boolean).join(' ');
      addMsg('g', (lang === 'fa' ? esc('آریما این‌طور معرفی شده است:') + '<br>' : '') + ltr(esc(text)) + `<span class="src">${esc(L.source)}</span>`, { lang });
      speak(lang === 'en' ? text : 'آریما این‌طور معرفی شده است.', lang);
      return;
    }
    const p = bestPlatform(q);
    if (p) {
      const st = p.status.map(statusLabel).join(', ');
      const body = `<b>${esc(p.name)}</b> · ${esc(st)}<br>${esc(p.what)}${p.limits ? `<br><i>${esc(p.limits)}</i>` : ''}`;
      addMsg('g', ltr(body) + `<span class="src">${esc(L.source)}</span>`, { lang });
      speak(lang === 'en' ? `${p.name}. Status: ${st}. ${p.what}` : L.source, lang);
      return;
    }
    say(L.unknown);
  }

  function ask(q) {
    addMsg('u', esc(q), { lang: /[؀-ۿ]/.test(q) ? 'fa' : 'en' });
    answer(q);
  }

  /* ------------------------------------------------------------------ access request */
  const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M}' .’-]{0,79}$/u;
  const EMAIL_RE = /^[^\s@"<>()[\]\\,;:]{1,64}@(?=.{1,253}$)(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/;
  const PHONE_RE = /^\+[1-9]\d{6,14}$/;
  const toLatinDigits = (s) => s.replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06F0)).replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
  const normalise = {
    firstName: (v) => v.normalize('NFC').replace(/\s+/g, ' ').trim(),
    lastName: (v) => v.normalize('NFC').replace(/\s+/g, ' ').trim(),
    email: (v) => toLatinDigits(v).trim(),
    phone: (v) => { const x = toLatinDigits(v).trim().replace(/^00/, '+'); return x.startsWith('+') ? '+' + x.slice(1).replace(/[\s().-]/g, '') : x.replace(/[\s().-]/g, ''); },
  };
  const valid = {
    firstName: (v) => NAME_RE.test(v) && !/https?:|www\./i.test(v),
    lastName: (v) => NAME_RE.test(v) && !/https?:|www\./i.test(v),
    email: (v) => v.length <= 254 && EMAIL_RE.test(v),
    phone: (v) => PHONE_RE.test(v),
  };
  const activeField = () => (req.active ? (req.editing || FIELDS[req.step]) : null);
  const newId = () => (crypto.randomUUID ? crypto.randomUUID() : Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join(''));

  function startRequest() {
    if (req.submitting) return;
    Object.assign(req, { active: true, step: 0, editing: null, answers: {}, startedAt: Date.now(), submissionId: null, done: false });
    summary.hidden = true;
    $('gCancel').hidden = false;
    renderChips();
    say(t().reqStart);
    askField();
  }

  function askField() {
    const field = activeField();
    err.textContent = '';
    hint.textContent = field === 'email' || field === 'phone' ? t().fmtNote : '';
    if (!field) return;
    say(t().q[field]);
    const isEmail = field === 'email';
    portal.hidden = !isEmail;
    $('gRow').hidden = isEmail;
    if (isEmail) {
      portal.classList.remove('open'); void portal.offsetWidth; portal.classList.add('open');
      email.value = req.answers.email || '';
      email.placeholder = t().ph.email;
      setTimeout(() => email.focus({ preventScroll: false }), reduce ? 0 : 450);
    } else {
      input.value = req.answers[field] || '';
      input.placeholder = t().ph[field];
      input.type = field === 'phone' ? 'tel' : 'text';
      input.setAttribute('autocomplete', { firstName: 'given-name', lastName: 'family-name', phone: 'tel' }[field]);
      input.inputMode = field === 'phone' ? 'tel' : 'text';
      input.dir = field === 'phone' ? 'ltr' : 'auto';
      input.maxLength = field === 'phone' ? 24 : 80;
      $('gLabel').textContent = t().labels[field];
      input.focus({ preventScroll: true });
    }
    $('gSend').textContent = t().next;
  }

  function resetInputs() {
    portal.hidden = true; portal.classList.remove('open');
    $('gRow').hidden = false;
    input.type = 'text'; input.inputMode = 'text'; input.dir = 'auto'; input.maxLength = 300; input.value = '';
    input.setAttribute('autocomplete', 'off');
    input.placeholder = t().askPh; $('gLabel').textContent = t().askLabel;
    $('gSend').textContent = t().send;
    hint.textContent = '';
  }

  function takeAnswer() {
    const field = activeField();
    const raw = field === 'email' ? email.value : input.value;
    const value = normalise[field](raw);
    if (!value) return;
    addMsg('u', esc(field === 'email' || field === 'phone' ? value : raw.trim()), { lang: field === 'email' || field === 'phone' ? 'en' : undefined });
    if (!valid[field](value)) {
      err.textContent = t().bad[field];
      say(t().bad[field]);
      (field === 'email' ? email : input).focus();
      return;
    }
    req.answers[field] = value;
    err.textContent = '';
    if (req.editing) { req.editing = null; showSummary(); return; }
    const ack = t().ack[field](value);
    req.step += 1;
    if (req.step < FIELDS.length) { addMsg('g', esc(ack), { lang }); askField(); }
    else { addMsg('g', esc(ack), { lang }); showSummary(); }
  }

  function showSummary() {
    resetInputs();
    form.hidden = true;
    req.submissionId = req.submissionId || newId();
    const L = t();
    const rows = FIELDS.map((f) => `<div><dt>${esc(L.labels[f])}</dt><dd dir="${f === 'email' || f === 'phone' ? 'ltr' : 'auto'}">${esc(req.answers[f])}</dd><button type="button" class="edit" data-f="${f}">${esc(L.edit)}</button></div>`).join('');
    summary.innerHTML = `<p><b>${esc(L.summaryTitle)}</b></p><dl>${rows}</dl>
      <p class="privacy">${esc(L.privacy(status.accessRequests.retentionDays || 180))}</p>
      <label><input type="checkbox" id="gConsent"> <span>${esc(L.consent)}</span></label>
      <div class="guide-actions"><button type="button" class="btn primary" id="gConfirm">${esc(L.confirmSend)}</button>
      <button type="button" class="btn ghost" id="gCancel2">${esc(L.cancel)}</button></div>
      <p class="guide-err" id="gErr2" role="alert"></p>`;
    summary.hidden = false;
    summary.querySelectorAll('button.edit').forEach((b) => b.addEventListener('click', () => editField(b.dataset.f)));
    $('gConfirm').addEventListener('click', submit);
    $('gCancel2').addEventListener('click', cancelRequest);
    say(L.summaryReady);
    $('gConfirm').focus({ preventScroll: true });
  }

  function editField(field) {
    if (req.submitting) return;
    req.editing = field;
    summary.hidden = true;
    form.hidden = false;
    say(t().editNow(t().labels[field]));
    askField();
  }

  function cancelRequest() {
    if (req.submitting) return;
    Object.assign(req, { active: false, step: -1, editing: null, answers: {}, submissionId: null });
    summary.hidden = true; form.hidden = false; $('gCancel').hidden = true;
    resetInputs(); err.textContent = '';
    say(t().cancelled);
    renderChips();
  }

  async function submit() {
    const L = t();
    const consent = $('gConsent');
    const err2 = $('gErr2');
    if (req.submitting || req.done) return;
    if (!consent.checked) { err2.textContent = L.needConsent; consent.focus(); return; }
    req.submitting = true;
    const btn = $('gConfirm');
    btn.disabled = true; btn.textContent = L.sending; btn.setAttribute('aria-busy', 'true');
    summary.querySelectorAll('button.edit, #gCancel2').forEach((b) => { b.disabled = true; });
    let outcome = 'failed', body = null;
    try {
      const r = await fetch('/api/access-requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...req.answers, submissionId: req.submissionId, confirmed: true, elapsedMs: Date.now() - req.startedAt,
          website: $('gHp').value, page: location.pathname, locale: lang }),
      });
      body = await r.json().catch(() => null);
      if ((r.status === 200 || r.status === 201) && body && body.recorded === true) outcome = 'recorded';
      else if (r.status === 503 && body && body.error === 'storage_not_configured') outcome = 'storageOff';
      else if (r.status === 429) outcome = 'rateLimited';
      else if (r.status === 422 && body && body.fields) outcome = 'invalid';
    } catch (e) { outcome = 'failed'; }
    req.submitting = false;

    if (outcome === 'recorded') {
      req.done = true;
      const emailLine = body.duplicate ? L.duplicate : !body.email.configured ? L.emailOff : body.email.status === 'accepted' ? L.emailAccepted : L.emailQueued;
      summary.hidden = true; form.hidden = false; $('gCancel').hidden = true;
      Object.assign(req, { active: false, step: -1, editing: null });
      resetInputs();
      addMsg('g', `<b>${esc(L.recorded('\u2066' + body.reference + '\u2069'))}</b><br>${esc(emailLine)}`, { lang }).dataset.outcome = 'recorded';
      speak(`${L.recorded(body.reference.split('').join(' '))} ${emailLine}`, lang);
      renderChips();
      return;
    }
    btn.disabled = false; btn.textContent = L.confirmSend; btn.removeAttribute('aria-busy');
    summary.querySelectorAll('button.edit, #gCancel2').forEach((b) => { b.disabled = false; });
    if (outcome === 'invalid') {
      const field = FIELDS.find((f) => body.fields[f]);
      if (field) { err2.textContent = L.bad[field]; return; }
    }
    err2.textContent = outcome === 'storageOff' ? L.storageOff : outcome === 'rateLimited' ? L.rateLimited : L.failed;
    speak(err2.textContent, lang);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (req.active) { takeAnswer(); return; }
    const q = input.value.trim();
    if (!q) return;
    input.value = '';
    ask(q);
  });
  $('gCancel').addEventListener('click', cancelRequest);

  /* ------------------------------------------------------------------ language */
  function applyLang(next) {
    lang = next;
    app.lang = lang; app.dir = lang === 'fa' ? 'rtl' : 'ltr';
    app.querySelectorAll('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    app.querySelectorAll('[data-t]').forEach((el) => { const v = t()[el.dataset.t]; if (typeof v === 'string') el.textContent = v; });
    $('gVoice').textContent = voice.on ? t().voiceOff : t().voiceOn;
    $('gMute').textContent = voice.muted ? t().unmute : t().mute;
    $('gMic').textContent = rec ? t().stop : t().speak;
    if (req.active && !summary.hidden) showSummary();
    else if (req.active) askField();
    else resetInputs();
    renderChips();
    updateVoiceNote();
  }
  app.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.lang === lang) return;
    stopSpeech();
    applyLang(b.dataset.lang);
    if (!req.active) say(t().intro);
  }));

  /* ------------------------------------------------------------------ avatar */
  const cv = $('guideAvatar');
  const g = cv.getContext('2d');
  let running = false, t0 = performance.now(), visible = false;
  function sizeCanvas() {
    const d = Math.min(2, window.devicePixelRatio || 1);
    const w = cv.clientWidth || 300;
    cv.width = Math.round(w * d); cv.height = Math.round(w * d);
  }
  function draw(now) {
    const W = cv.width, H = cv.height, cx = W / 2, cy = H / 2, R = W * 0.36;
    const time = reduce ? 0 : (now - t0) / 1000;
    voice.level = voice.speaking ? Math.min(1, voice.level * 0.9 + 0.25 + 0.25 * Math.sin(time * 13)) : voice.level * 0.9;
    const amp = voice.speaking ? 0.35 + 0.65 * Math.abs(Math.sin(time * 7.3) * Math.sin(time * 2.1 + 1)) : 0.06;
    g.clearRect(0, 0, W, H);
    // halo
    const halo = g.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.45);
    halo.addColorStop(0, `rgba(233,192,112,${0.22 + amp * 0.12})`);
    halo.addColorStop(0.55, 'rgba(105,200,255,0.08)');
    halo.addColorStop(1, 'rgba(1,3,5,0)');
    g.fillStyle = halo; g.fillRect(0, 0, W, H);
    // core
    const core = g.createRadialGradient(cx - R * 0.25, cy - R * 0.3, R * 0.05, cx, cy, R);
    core.addColorStop(0, 'rgba(255,246,226,0.95)');
    core.addColorStop(0.35, 'rgba(233,192,112,0.55)');
    core.addColorStop(0.75, 'rgba(60,110,150,0.35)');
    core.addColorStop(1, 'rgba(10,20,30,0.15)');
    g.beginPath(); g.arc(cx, cy, R * (0.72 + amp * 0.03), 0, Math.PI * 2); g.fillStyle = core; g.fill();
    // orbit rings
    g.lineWidth = Math.max(1, W / 300);
    for (let i = 0; i < 3; i += 1) {
      g.save(); g.translate(cx, cy); g.rotate(time * (0.12 + i * 0.07) * (i % 2 ? -1 : 1) + i);
      g.scale(1, 0.32 + i * 0.12);
      g.strokeStyle = i === 1 ? 'rgba(105,200,255,0.45)' : 'rgba(233,192,112,0.5)';
      g.beginPath(); g.arc(0, 0, R * (1.02 + i * 0.12), 0, Math.PI * 2); g.stroke();
      const a = time * (0.6 + i * 0.2);
      g.fillStyle = 'rgba(255,240,210,0.9)'; g.beginPath(); g.arc(Math.cos(a) * R * (1.02 + i * 0.12), Math.sin(a) * R * (1.02 + i * 0.12), W / 160, 0, Math.PI * 2); g.fill();
      g.restore();
    }
    // voice line: a market-like trace that lifts while speaking
    g.beginPath();
    const n = 64;
    for (let k = 0; k <= n; k += 1) {
      const x = cx - R * 0.6 + (k / n) * R * 1.2;
      const env = Math.sin((k / n) * Math.PI);
      const y = cy + R * 0.05 + env * R * 0.16 * amp * (Math.sin(k * 0.55 + time * 9) * 0.7 + Math.sin(k * 1.7 - time * 5) * 0.3);
      if (k) g.lineTo(x, y); else g.moveTo(x, y);
    }
    g.strokeStyle = 'rgba(2,6,11,0.75)'; g.lineWidth = Math.max(1.5, W / 170); g.stroke();
    if (running) requestAnimationFrame(draw);
  }
  function setRunning(on) {
    if (reduce) { sizeCanvas(); draw(performance.now()); return; }
    if (on && !running) { running = true; requestAnimationFrame(draw); } else if (!on) running = false;
  }
  sizeCanvas();
  draw(performance.now());
  if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => { visible = e.isIntersecting; setRunning(visible); }).observe(cv);
  addEventListener('resize', () => { sizeCanvas(); if (!running) draw(performance.now()); });
  // keep the static avatar in step with speaking when motion is reduced
  if (reduce) setInterval(() => { if (visible) draw(performance.now()); }, 500);

  /* ------------------------------------------------------------------ start */
  applyLang('en');
  addMsg('g', esc(t().intro), { lang });
  voice.last = { text: t().intro, lang };
})();
