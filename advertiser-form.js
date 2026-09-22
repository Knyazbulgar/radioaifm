document.getElementById('advertiser-form').addEventListener('submit', async function(e) {
  e.preventDefault();

  const button = this.querySelector('button[type="submit"]');
  const messageDiv = document.getElementById('form-message');
  button.disabled = true;

  // Собираем данные
  const formData = new FormData(this);
  const data = Object.fromEntries(formData);

  try {
    // Отправляем на сервер
    const response = await fetch('/api/advertiser-form', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });

    if (response.ok) {
      // GA событие: форма отправлена
      if (window.gtag) {
        gtag('event', 'advertiser_form_submitted', {
          company: data.company || 'not_provided',
          budget_range: data.budget
        });
      }

      messageDiv.textContent = 'Спасибо! Мы свяжемся с вами в течение 24 часов.';
      messageDiv.className = 'form-message success';
      this.reset();
    } else {
      throw new Error('Ошибка отправки');
    }
  } catch (error) {
    messageDiv.textContent = 'Ошибка при отправке. Попробуйте позже или свяжитесь с нами напрямую.';
    messageDiv.className = 'form-message error';
  } finally {
    button.disabled = false;
  }
});

// GA событие: скачивание медиакита
document.getElementById('download-mediakit')?.addEventListener('click', function() {
  if (window.gtag) {
    gtag('event', 'mediakit_download');
  }
});

// GA события: клик по контактам
document.querySelectorAll('[data-contact-type]').forEach(el => {
  el.addEventListener('click', function() {
    if (window.gtag) {
      gtag('event', 'advertiser_contact_click', {
        contact_type: this.dataset.contactType
      });
    }
  });
});
