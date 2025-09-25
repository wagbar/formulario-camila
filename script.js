document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('preConsultationForm');
  const currentYearSpan = document.getElementById('currentYear');
  currentYearSpan.textContent = new Date().getFullYear();

  const cpfInput = document.getElementById('cpf');
  const phoneInput = document.getElementById('phone');
  const otherConditionCheckbox = document.getElementById('otherCondition');
  const otherConditionContainer = document.getElementById('otherConditionContainer');
  const otherRadio = document.getElementById('other');
  const otherSourceContainer = document.getElementById('otherSourceContainer');

  // === Funções de Máscara ===
  cpfInput.addEventListener('input', () => {
    let value = cpfInput.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    cpfInput.value = value;
  });

  phoneInput.addEventListener('input', () => {
    let value = phoneInput.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    if (value.length <= 10) {
      value = value.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    } else {
      value = value.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
    }
    phoneInput.value = value;
  });

  // === Funções auxiliares ===
  function toggleOtherCondition() {
    otherConditionContainer.style.display = otherConditionCheckbox.checked ? 'block' : 'none';
    if (!otherConditionCheckbox.checked) document.getElementById('otherConditionText').value = '';
  }

  function toggleOtherSource() {
    otherSourceContainer.style.display = otherRadio.checked ? 'block' : 'none';
    if (!otherRadio.checked) document.getElementById('otherSource').value = '';
  }

  otherConditionCheckbox.addEventListener('change', toggleOtherCondition);
  document.querySelectorAll('input[name="sourceChannel"]').forEach(radio => {
    radio.addEventListener('change', toggleOtherSource);
  });
  toggleOtherCondition();
  toggleOtherSource();

  // Barra de progresso
  const progressSteps = document.querySelectorAll('.progress-step');
  window.addEventListener('scroll', () => {
    const sections = document.querySelectorAll('.form-section');
    const scrollPosition = window.scrollY + 100;
    sections.forEach((section, index) => {
      const sectionTop = section.offsetTop;
      if (scrollPosition >= sectionTop) {
        progressSteps.forEach(step => step.classList.remove('step-active'));
        if (index < progressSteps.length) progressSteps[index].classList.add('step-active');
      }
    });
  });

  // === Funções de validação ===
  function validarCPF(cpf) {
    cpf = cpf.replace(/[^\d]+/g, '');
    if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;

    let soma = 0, resto;
    for (let i = 1; i <= 9; i++) soma += parseInt(cpf.substring(i-1, i)) * (11 - i);
    resto = (soma * 10) % 11;
    if ((resto === 10) || (resto === 11)) resto = 0;
    if (resto !== parseInt(cpf.substring(9, 10))) return false;

    soma = 0;
    for (let i = 1; i <= 10; i++) soma += parseInt(cpf.substring(i-1, i)) * (12 - i);
    resto = (soma * 10) % 11;
    if ((resto === 10) || (resto === 11)) resto = 0;
    return resto === parseInt(cpf.substring(10, 11));
  }

  function validarTelefone(telefone) {
    const apenasNumeros = telefone.replace(/\D/g, '');
    return apenasNumeros.length >= 10 && apenasNumeros.length <= 11;
  }

  function validarEmail(email) {
    if (!email) return true;
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  // Limpar bordas ao digitar
  form.querySelectorAll('input, textarea').forEach(input => {
    input.addEventListener('input', () => input.style.borderColor = '');
  });

  // === Validação no envio ===
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    let erros = [];

    const nome = form.fullName.value.trim();
    if (nome.length < 3) {
      erros.push('Nome deve ter pelo menos 3 caracteres.');
      form.fullName.style.borderColor = 'red';
    }

    const nascimento = new Date(form.birthDate.value);
    if (!(nascimento < new Date())) {
      erros.push('Data de nascimento inválida.');
      form.birthDate.style.borderColor = 'red';
    }

    const cpf = form.cpf.value.trim();
    if (!validarCPF(cpf)) {
      erros.push('CPF inválido.');
      form.cpf.style.borderColor = 'red';
    }

    const telefone = form.phone.value.trim();
    if (!validarTelefone(telefone)) {
      erros.push('Telefone inválido (use DDD e número, ex: (99) 99999-9999).');
      form.phone.style.borderColor = 'red';
    }

    const email = form.email.value.trim();
    if (!validarEmail(email)) {
      erros.push('E-mail inválido.');
      form.email.style.borderColor = 'red';
    }

    const motivo = form.reason.value.trim();
    if (motivo.length < 10) {
      erros.push('Motivo da consulta deve ter pelo menos 10 caracteres.');
      form.reason.style.borderColor = 'red';
    }

     if (erros.length > 0) {
    Swal.fire({ icon:'error', title:'Erro de validação', html:erros.join('<br>') });
    return;
     }

    const fd = new FormData(form);
    const formData = {};
    fd.forEach((value, key) => {
        if (key === 'conditions') {
            if (!formData.conditions) formData.conditions = [];
            formData.conditions.push(value);
        } else {
            formData[key] = value;
        }
     });
     
     try {
        const res = await fetch('/.netlify/functions/send-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        const result = await res.json();
         Swal.fire({ icon:'success', title:'Enviado!', text: result.message });
        form.reset();
      } catch (err) {
        Swal.fire({ icon:'error', title:'Falha', text:'Erro ao enviar o formulário.' });
    }
    });
});
