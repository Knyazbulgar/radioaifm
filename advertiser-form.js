document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('advertiser-form');
  
  if (!form) {
    console.error('Форма не найдена');
    return;
  }

  form.addEventListener('submit', async function(e) {
    e.preventDefault();

    const formData = {
      name: form.querySelector('input[name="name"]').value.trim(),
      email: form.querySelector('input[name="email"]').value.trim(),
      company: form.querySelector('input[name="company"]').value.trim() || 'не указано',
      phone: form.querySelector('input[name="phone"]').value.trim() || 'не указано',
      budget: form.querySelector('select[name="budget"]').value,
      message: form.querySelector('textarea[name="message"]').value.trim()
    };

    const btn = form.querySelector('.btn-primary');
    const messageEl = document.getElementById('form-message');
    
    btn.disabled = true;
    btn.textContent = 'Отправка…';
    messageEl.textContent = '';
    messageEl.className = 'form-message';

    try {
      const response = await fetch('https://radioaifm-advertiser.pesnibulgara.workers.dev', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.ok) {
        messageEl.textContent = '✅ Заявка отправлена! Мы свяжемся с вами в течение 24 часов.';
        messageEl.className = 'form-message success';
        form.reset();
      } else {
        messageEl.textContent = '❌ Ошибка: ' + (data.error || 'Попробуйте ещё раз');
        messageEl.className = 'form-message error';
      }
    } catch (error) {
      messageEl.textContent = '❌ Ошибка подключения. Проверьте интернет.';
      messageEl.className = 'form-message error';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Отправить заявку';
    }
  });
});
