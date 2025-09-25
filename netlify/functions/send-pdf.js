const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');
const { PassThrough } = require('stream');

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const data = JSON.parse(event.body);

    // === Criar PDF estilizado ===
    const doc = new PDFDocument({ margin: 50 });
    const buffers = [];
    const stream = new PassThrough();
    doc.pipe(stream);
    stream.on('data', buffers.push.bind(buffers));
    const endPromise = new Promise((resolve) => stream.on('end', resolve));

    // Cabeçalho com título
    doc
      .fontSize(24)
      .fillColor('#2e2e1f')
      .font('Helvetica-Bold')
      .text('Pré-consulta Nefrológica', { align: 'center' });

    doc.moveDown(1.5);

    // Linha separadora
    doc.strokeColor('#4CAF50').lineWidth(2)
      .moveTo(50, doc.y).lineTo(550, doc.y).stroke();

    doc.moveDown(1.5);

    // Bloco de informações pessoais com fundo leve
    doc.rect(45, doc.y, 520, 160).fill('#f7f7f7');
    doc.fillColor('#000').fontSize(12).font('Helvetica');
    doc.text(`Nome: ${data.fullName}`, 55, doc.y + 10);
    doc.text(`Data de nascimento: ${data.birthDate}`);
    doc.text(`CPF: ${data.cpf}`);
    doc.text(`Endereço: ${data.address}`);
    doc.text(`Cidade/Estado: ${data.city}`);
    doc.text(`Telefone: ${data.phone}`);
    doc.text(`E-mail: ${data.email || 'Não informado'}`);
    doc.moveDown(6);

    // Motivo da consulta
    doc.fillColor('#4CAF50').font('Helvetica-Bold').fontSize(14)
      .text('Motivo da Consulta', { underline: true });
    doc.moveDown(0.5);
    doc.fillColor('#000').font('Helvetica').fontSize(12)
      .text(data.reason, { width: 500, align: 'justify' });

    doc.moveDown(1.5);

    // Histórico Médico
    doc.fillColor('#4CAF50').font('Helvetica-Bold').fontSize(14)
      .text('Histórico Médico', { underline: true });
    doc.moveDown(0.5);
    const conditionsList = [].concat(data.conditions || []);
    doc.fillColor('#000').font('Helvetica').fontSize(12)
      .text(conditionsList.length ? conditionsList.join(', ') : 'Nenhuma');
    if (data.otherConditionText)
      doc.text(`Outras condições: ${data.otherConditionText}`);
    if (data.procedures)
      doc.text(`Procedimentos: ${data.procedures}`);
    doc.text(`Biópsia renal: ${data.biopsy}`);
    if (data.biopsyResult)
      doc.text(`Resultado: ${data.biopsyResult}`);

    doc.moveDown(1.5);

    // Origem do contato
    doc.fillColor('#4CAF50').font('Helvetica-Bold').fontSize(14)
      .text('Origem do Contato', { underline: true });
    doc.moveDown(0.5);
    doc.fillColor('#000').font('Helvetica').fontSize(12)
      .text(`Origem: ${data.sourceChannel}`);
    if (data.otherSource)
      doc.text(`Especificação: ${data.otherSource}`);

    doc.moveDown(2);

    // Rodapé com linha separadora
    const footerY = doc.y + 20;
    doc.strokeColor('#ddd').lineWidth(1)
      .moveTo(50, footerY).lineTo(550, footerY).stroke();
    doc.fontSize(10).fillColor('#999').text(
      `Gerado automaticamente em ${new Date().toLocaleDateString('pt-BR')}`,
      50, footerY + 10, { align: 'center', width: 500 }
    );

    doc.end();
    await endPromise;
    const pdfBuffer = Buffer.concat(buffers);

    // === Configurar transporte de e-mail ===
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // Gera timestamp legível
    const date = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');

    // Usa o nome do paciente sem espaços para o arquivo
    const safeName = data.fullName.replace(/\s+/g, '_');

    // Criar nome seguro do paciente
    const safeName2 = data.fullName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const date2 = new Date().toISOString().split('T')[0];

    // Enviar e-mail
    await transporter.sendMail({
      from: `"Formulário Camilla" <${process.env.EMAIL_USER}>`,
      to: 'eduardopbruder@gmail.com', // médica
      cc: data.email && data.email.trim() !== '' ? data.email : undefined, // cópia para paciente se tiver email
      subject: `Pré-consulta de ${data.fullName} (${date})`,
      text: 'Segue em anexo o PDF da pré-consulta.',
      attachments: [
        { filename: `pre-consulta-${safeName}-${date}.pdf`, content: pdfBuffer }
      ]
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'E-mail enviado com sucesso!' })
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: 'Erro ao enviar PDF.' };
  }
};
