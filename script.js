const form = document.getElementById('jobForm');
const service = document.getElementById('service');
const success = document.getElementById('success');
const area = document.getElementById('area');
const details = document.getElementById('details');
const urgency = document.getElementById('urgency');

function selectService(name) {
  service.value = name;
  document.querySelectorAll('[data-service]').forEach((button) => button.classList.toggle('selected', button.dataset.service === name));
}

document.querySelectorAll('[data-service]').forEach((button) => button.addEventListener('click', () => selectService(button.dataset.service)));
service.addEventListener('change', () => selectService(service.value));

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const job = { service: service.value, area: area.value, details: details.value, urgency: urgency.value, createdAt: new Date().toISOString() };
  localStorage.setItem('latestTradeConnectRequest', JSON.stringify(job));
  success.textContent = `You’re all set — we’ll look for ${job.service.toLowerCase()} professionals near ${job.area}.`;
  success.hidden = false;
  success.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});

document.getElementById('proButton').addEventListener('click', () => alert('Professional signup is coming soon. Thanks for your interest!'));

const cursor = document.querySelector('.cursor-glow');
window.addEventListener('pointermove', (event) => { cursor.style.transform = `translate(${event.clientX - 130}px, ${event.clientY - 130}px)`; }, { passive: true });

const observer = new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) entry.target.classList.add('in-view'); }), { threshold: .14 });
document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));
