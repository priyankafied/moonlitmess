const screens = document.querySelectorAll('.screen');

const reflections = [
  "Is there anything here you can change right now?",
  "What feels heaviest in this?",
  "What would feel like a little less?",
  "Can this wait for now?",
  "What are you holding onto?"
];

const lightMessages = [
  "It got lighter without you noticing.",
  "This won’t always feel like this.",
  "You don’t have to solve everything today.",
  "You’re doing better than you think.",
  "It’s okay to let this pass."
];

function goTo(id){
  screens.forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');

  if(id==='reflection'){
    document.getElementById('question').innerText =
      reflections[Math.floor(Math.random()*reflections.length)];
  }

  if(id==='release'){
    const msg = document.getElementById('message').value || "let go";
    document.getElementById('releaseText').innerText = msg;
  }

  if(id==='light'){
    document.getElementById('lightMessage').innerText =
      lightMessages[Math.floor(Math.random()*lightMessages.length)];
  }
}
