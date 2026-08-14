// ---- talk.html: mode + plan selection ----
function selectMode(el, mode){
  document.querySelectorAll('.mode-opt').forEach(function(o){ o.classList.remove('selected'); });
  el.classList.add('selected');
  el.closest('form').dataset.mode = mode;
}

// price curve fitted through the fixed plans; used to price custom durations too
const PRICE_POINTS = [[15,49],[20,99],[40,149],[60,199]];
function costForDuration(minutes){
  minutes = Math.max(5, Number(minutes) || 15);
  const pts = PRICE_POINTS;
  if(minutes <= pts[0][0]){
    const slope = (pts[1][1]-pts[0][1])/(pts[1][0]-pts[0][0]);
    return Math.max(20, Math.round(pts[0][1] + slope*(minutes-pts[0][0])));
  }
  if(minutes >= pts[pts.length-1][0]){
    const a = pts[pts.length-2], b = pts[pts.length-1];
    const slope = (b[1]-a[1])/(b[0]-a[0]);
    return Math.round(b[1] + slope*(minutes-b[0]));
  }
  for(let i=0;i<pts.length-1;i++){
    const a = pts[i], b = pts[i+1];
    if(minutes >= a[0] && minutes <= b[0]){
      const slope = (b[1]-a[1])/(b[0]-a[0]);
      return Math.round(a[1] + slope*(minutes-a[0]));
    }
  }
  return 49;
}

function selectPlan(el){
  document.querySelectorAll('.plan-opt').forEach(function(o){ o.classList.remove('selected'); });
  el.classList.add('selected');
  var form = el.closest('form');
  const customBox = document.getElementById('customDurationBox');

  if(el.dataset.duration === 'custom'){
    if(customBox) customBox.style.display = 'block';
    const mins = document.getElementById('customMinutes');
    const duration = mins ? mins.value : 30;
    const amount = costForDuration(duration);
    form.dataset.duration = duration;
    form.dataset.amount = amount;
    const tag = document.getElementById('customPriceTag');
    if(tag) tag.textContent = '≈ ₹' + amount;
  } else {
    if(customBox) customBox.style.display = 'none';
    form.dataset.duration = el.dataset.duration;
    form.dataset.amount = el.dataset.amount;
  }
  updateCostSummary();
}

function onCustomMinutesChange(){
  const form = document.getElementById('talkForm');
  const mins = document.getElementById('customMinutes');
  if(!form || !mins) return;
  const duration = mins.value;
  const amount = costForDuration(duration);
  form.dataset.duration = duration;
  form.dataset.amount = amount;
  const tag = document.getElementById('customPriceTag');
  if(tag) tag.textContent = '≈ ₹' + amount;
  updateCostSummary();
}

// ---- talk.html: frequency (times per week) ----
function selectFreq(el){
  document.querySelectorAll('.freq-pill').forEach(function(o){ o.classList.remove('selected'); });
  el.classList.add('selected');
  el.closest('form').dataset.freq = el.dataset.freq;
  updateCostSummary();
}

// ---- talk.html: preferred-days calendar ----
const calState = { year: null, month: null, selected: new Set() };

function pad2(n){ return n < 10 ? '0'+n : ''+n; }
function dateKey(y,m,d){ return y + '-' + pad2(m+1) + '-' + pad2(d); }

function renderCalendar(){
  const grid = document.getElementById('calGrid');
  const label = document.getElementById('calMonthLabel');
  if(!grid || !label) return;

  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  label.textContent = monthNames[calState.month] + ' ' + calState.year;

  const today = new Date();
  today.setHours(0,0,0,0);

  const firstDow = new Date(calState.year, calState.month, 1).getDay();
  const daysInMonth = new Date(calState.year, calState.month + 1, 0).getDate();

  grid.innerHTML = '';
  for(let i=0;i<firstDow;i++){
    const empty = document.createElement('div');
    empty.className = 'cal-cell empty';
    grid.appendChild(empty);
  }
  for(let d=1; d<=daysInMonth; d++){
    const cell = document.createElement('div');
    const cellDate = new Date(calState.year, calState.month, d);
    const key = dateKey(calState.year, calState.month, d);
    cell.className = 'cal-cell';
    cell.textContent = d;
    if(cellDate < today){
      cell.classList.add('past');
    } else {
      if(calState.selected.has(key)) cell.classList.add('selected');
      cell.addEventListener('click', function(){ toggleCalDate(key, cell); });
    }
    grid.appendChild(cell);
  }
}

function toggleCalDate(key, cell){
  if(calState.selected.has(key)){
    calState.selected.delete(key);
    cell.classList.remove('selected');
  } else {
    calState.selected.add(key);
    cell.classList.add('selected');
  }
  const form = document.getElementById('talkForm');
  if(form) form.dataset.dates = Array.from(calState.selected).sort().join(',');
}

function calShift(delta){
  const today = new Date();
  let m = calState.month + delta;
  let y = calState.year;
  if(m < 0){ m = 11; y--; }
  if(m > 11){ m = 0; y++; }
  if(y < today.getFullYear() || (y === today.getFullYear() && m < today.getMonth())) return;
  calState.month = m;
  calState.year = y;
  renderCalendar();
}

function initCalendar(){
  const today = new Date();
  calState.year = today.getFullYear();
  calState.month = today.getMonth();
  renderCalendar();
}

// ---- talk.html: live cost summary ----
function updateCostSummary(){
  const form = document.getElementById('talkForm');
  const perSessionEl = document.getElementById('perSessionAmt');
  const weeklyEl = document.getElementById('weeklyAmt');
  if(!form || !perSessionEl || !weeklyEl) return;
  const amount = Number(form.dataset.amount) || 49;
  const freq = Number(form.dataset.freq) || 1;
  perSessionEl.textContent = '₹' + amount;
  weeklyEl.textContent = '₹' + (amount * freq) + ' / week';
}

// talk.html form -> redirect to payment.html with details in the URL
function submitTalkForm(e){
  e.preventDefault();
  const form = e.target;
  const input = document.getElementById('talkerNick');
  const errorEl = document.getElementById('nameError');
  const nick = input.value.trim();
  if(!nick){
    input.focus();
    input.style.borderColor = '#b8503f';
    if(errorEl) errorEl.style.display = 'block';
    return;
  }
  input.style.borderColor = '';
  if(errorEl) errorEl.style.display = 'none';
  const mode = form.dataset.mode || 'listen';
  const duration = form.dataset.duration || '15';
  const amount = form.dataset.amount || '49';
  const freq = form.dataset.freq || '1';
  const dates = form.dataset.dates || '';
  const timeInput = document.getElementById('timeHour');
  let time = '';
  if(timeInput){
    const h12 = Number(document.getElementById('timeHour').value);
    const min = document.getElementById('timeMinute').value;
    const period = document.getElementById('timePeriod').value;
    let h24 = h12 % 12;
    if(period === 'PM') h24 += 12;
    time = (h24 < 10 ? '0' + h24 : '' + h24) + ':' + min;
  }
  const weeklyAmount = Number(amount) * Number(freq);
  const params = new URLSearchParams({
    name: nick, mode: mode, duration: duration, amount: amount,
    freq: freq, dates: dates, time: time, weekly: String(weeklyAmount)
  });
  window.location.href = 'payment.html?' + params.toString();
}

document.addEventListener('DOMContentLoaded', function(){
  if(document.getElementById('calGrid')){
    initCalendar();
    updateCostSummary();
  }
});

// ---- payment.html: build UPI deep link, QR, and continue button ----
const UPI_ID = 'abinashdebnath32129@okaxis';
const UPI_PAYEE_NAME = 'Confidein';
const OWNER_EMAIL = 'abinashdebnath32129@gmail.com';

function formatDates(datesStr){
  if(!datesStr) return '';
  return datesStr.split(',').filter(Boolean).map(function(d){
    const parts = d.split('-');
    const dt = new Date(Number(parts[0]), Number(parts[1])-1, Number(parts[2]));
    return dt.toLocaleDateString('en-IN', { day:'numeric', month:'short' });
  }).join(', ');
}

function formatTime(t){
  if(!t) return '';
  const parts = t.split(':');
  let h = Number(parts[0]);
  const m = parts[1];
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12; if(h === 0) h = 12;
  return h + ':' + m + ' ' + ampm;
}

function hydratePaymentPage(){
  const params = new URLSearchParams(window.location.search);
  const name = params.get('name') || 'Guest';
  const mode = params.get('mode') || 'listen';
  const duration = params.get('duration') || '15';
  const amount = params.get('amount') || '49';
  const freq = params.get('freq') || '';
  const dates = params.get('dates') || '';
  const time = params.get('time') || '';
  const weekly = params.get('weekly') || '';

  const modeLabel = mode === 'advice' ? 'open to advice' : 'just wants to be heard';

  document.getElementById('planLine').textContent = duration + ' minute call — ' + modeLabel;
  document.getElementById('amountLine').textContent = '₹' + amount;

  if(freq){
    const freqRowLine = document.getElementById('freqRowLine');
    const freqLine = document.getElementById('freqLine');
    if(freqRowLine && freqLine){ freqLine.textContent = freq + 'x / week'; freqRowLine.style.display = 'flex'; }
  }
  const datesFormatted = formatDates(dates);
  if(datesFormatted){
    const daysRowLine = document.getElementById('daysRowLine');
    const daysLine = document.getElementById('daysLine');
    if(daysRowLine && daysLine){ daysLine.textContent = datesFormatted; daysRowLine.style.display = 'flex'; }
  }
  const timeFormatted = formatTime(time);
  if(timeFormatted){
    const timeRowLine = document.getElementById('timeRowLine');
    const timeLine = document.getElementById('timeLine');
    if(timeRowLine && timeLine){ timeLine.textContent = timeFormatted; timeRowLine.style.display = 'flex'; }
  }
  if(weekly && Number(freq) > 1){
    const weeklyRowLine = document.getElementById('weeklyRowLine');
    const weeklyLine = document.getElementById('weeklyLine');
    if(weeklyRowLine && weeklyLine){ weeklyLine.textContent = '₹' + weekly + ' (approx, for reference)'; weeklyRowLine.style.display = 'flex'; }
  }

  const upiUrl = 'upi://pay?pa=' + encodeURIComponent(UPI_ID) +
                 '&pn=' + encodeURIComponent(UPI_PAYEE_NAME) +
                 '&am=' + encodeURIComponent(amount) +
                 '&cu=INR' +
                 '&tn=' + encodeURIComponent('Confidein call - ' + name);

  let scheduleLines = '';
  if(freq) scheduleLines += 'Frequency: ' + freq + 'x / week\n';
  if(datesFormatted) scheduleLines += 'Preferred days: ' + datesFormatted + '\n';
  if(timeFormatted) scheduleLines += 'Preferred time: ' + timeFormatted + '\n';

  const notifySubject = encodeURIComponent('Payment done — ' + name);
  const notifyBody = encodeURIComponent(
    'Hi, I\'ve completed the payment.\n\n' +
    'Name: ' + name + '\n' +
    'Wants: ' + modeLabel + '\n' +
    'Plan: ' + duration + ' minutes\n' +
    'Amount: ₹' + amount + '\n' +
    scheduleLines + '\n' +
    'Please confirm and share a time for the call.'
  );
  const notifyMailto = 'mailto:' + OWNER_EMAIL + '?subject=' + notifySubject + '&body=' + notifyBody;

  const payBtn = document.getElementById('payBtn');
  if(payBtn) payBtn.href = upiUrl;

  const qrImg = document.getElementById('qrImg');
  if(qrImg){
    qrImg.src = 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=' + encodeURIComponent(upiUrl);
  }

  const continueBtn = document.getElementById('continueBtn');
  const continueHint = document.getElementById('continueHint');
  const upiInput = document.getElementById('upiTxnId');
  const googleInput = document.getElementById('googleTxnId');

  function txnIdsFilled(){
    return !!(upiInput && upiInput.value.trim());
  }

  function refreshContinueState(){
    if(!continueBtn) return;
    const ready = txnIdsFilled();
    continueBtn.setAttribute('aria-disabled', ready ? 'false' : 'true');
    if(continueHint){
      continueHint.textContent = ready
        ? 'Tapping this will open your email app to send us a payment confirmation.'
        : 'Paste your UPI transaction ID above to continue.';
    }
  }

  if(upiInput) upiInput.addEventListener('input', refreshContinueState);
  if(googleInput) googleInput.addEventListener('input', refreshContinueState);
  refreshContinueState();

  if(continueBtn){
    continueBtn.addEventListener('click', function(e){
      e.preventDefault();
      if(!txnIdsFilled()){
        if(upiInput) upiInput.focus();
        return;
      }
      const upiTxnId = upiInput.value.trim();
      const googleTxnId = googleInput ? googleInput.value.trim() : '';
      const fullNotifyBody = encodeURIComponent(
        decodeURIComponent(notifyBody.replace(/\+/g, '%20')) +
        '\n\nUPI transaction ID: ' + upiTxnId +
        (googleTxnId ? '\nGoogle transaction ID: ' + googleTxnId : '')
      );
      const fullNotifyMailto = 'mailto:' + OWNER_EMAIL + '?subject=' + notifySubject + '&body=' + fullNotifyBody;

      const contactParams = new URLSearchParams({
        name: name, mode: mode, duration: duration, amount: amount, paid: '1',
        upiTxn: upiTxnId, googleTxn: googleTxnId
      });
      const contactUrl = 'contact.html?' + contactParams.toString();

      window.location.href = fullNotifyMailto;
      setTimeout(function(){ window.location.href = contactUrl; }, 600);
    });
  }
}

// ---- contact.html: read query params and personalize ----
function hydrateContactPage(){
  const params = new URLSearchParams(window.location.search);
  const name = params.get('name');
  const mode = params.get('mode');
  const duration = params.get('duration');
  const amount = params.get('amount');
  const paid = params.get('paid');

  const summaryEl = document.getElementById('summaryLine');
  const summaryCard = document.getElementById('summaryCard');
  const mailLink = document.getElementById('mailLink');
  const paidNote = document.getElementById('paidNote');

  if(name){
    const modeLabel = mode === 'advice' ? 'open to advice' : 'just wants to be heard';
    const durationText = duration ? (duration + ' min call' ) : '';
    let line = name + ' — ' + modeLabel;
    if(durationText) line += ' — ' + durationText;
    if(amount) line += ' — ₹' + amount;
    if(summaryEl) summaryEl.textContent = line;
    if(summaryCard) summaryCard.style.display = 'block';

    if(paid === '1' && paidNote) paidNote.style.display = 'block';

    if(mailLink){
      const subject = encodeURIComponent('Schedule a call — ' + name);
      let bodyText = 'Hi, I would like to schedule a call.\n\nName: ' + name + '\nI\'m: ' + modeLabel;
      if(duration) bodyText += '\nLength: ' + duration + ' minutes';
      if(amount) bodyText += '\nAmount paid: ₹' + amount;
      const body = encodeURIComponent(bodyText);
      mailLink.href = 'mailto:abinashdebnath32129@gmail.com?subject=' + subject + '&body=' + body;
    }
  }
}

document.addEventListener('DOMContentLoaded', function(){
  if(document.body.dataset.page === 'contact'){
    hydrateContactPage();
  }
  if(document.body.dataset.page === 'payment'){
    hydratePaymentPage();
  }
});
