function selectService(service){
  document.getElementById('service').value = service;
  document.getElementById('request').scrollIntoView({behavior:'smooth'});
}

document.getElementById('jobForm').addEventListener('submit', function(e){
  e.preventDefault();
  const job = {
    service: document.getElementById('service').value,
    area: document.getElementById('area').value,
    details: document.getElementById('details').value,
    urgency: document.getElementById('urgency').value,
    createdAt: new Date().toISOString()
  };
  localStorage.setItem('latestTradeConnectRequest', JSON.stringify(job));
  document.getElementById('success').hidden = false;
  this.reset();
});
