const { Resend } = require("resend");
const path = require("node:path");
const fs = require("node:fs");

const { resetMailText, verifyMailText, changeEmailText } = require("./text");
const { CustomError } = require("../utils");
const env = require("../env");

const resend = new Resend(env.RESEND_API_KEY);

// Read email templates
const resetEmailTemplatePath = path.join(__dirname, "template-reset.html");
const verifyEmailTemplatePath = path.join(__dirname, "template-verify.html");
const changeEmailTemplatePath = path.join(__dirname,"template-change-email.html");
const reportEmailTemplatePath = path.join(__dirname,"template-report-email.html");

let resetEmailTemplate, 
    verifyEmailTemplate,
    changeEmailTemplate,
    reportEmailTemplate;

if (env.MAIL_ENABLED) {
  resetEmailTemplate = fs
    .readFileSync(resetEmailTemplatePath, { encoding: "utf-8" })
    .replace(/{{domain}}/gm, env.DEFAULT_DOMAIN)
    .replace(/{{site_name}}/gm, env.SITE_NAME);

  verifyEmailTemplate = fs
    .readFileSync(verifyEmailTemplatePath, { encoding: "utf-8" })
    .replace(/{{domain}}/gm, env.DEFAULT_DOMAIN)
    .replace(/{{site_name}}/gm, env.SITE_NAME);

  changeEmailTemplate = fs
    .readFileSync(changeEmailTemplatePath, { encoding: "utf-8" })
    .replace(/{{domain}}/gm, env.DEFAULT_DOMAIN)
    .replace(/{{site_name}}/gm, env.SITE_NAME);
  reportEmailTemplate = fs
    .readFileSync(reportEmailTemplatePath, { encoding: "utf-8" })
    .replace(/{{domain}}/gm, env.DEFAULT_DOMAIN)
    .replace(/{{site_name}}/gm, env.SITE_NAME);
  }

async function sendEmail({ to, subject, text, html }) {
  if (!env.MAIL_ENABLED) {
    throw new Error("Attempting to send email but email is not enabled.");
  }

  try {
    const message = await resend.emails.send({
      from: env.MAIL_FROM || env.DEFAULT_EMAIL_FROM,
      to,
      subject,
      text,
      html,
    });
    return message;
  } catch (err) {
    throw new CustomError(`Couldn't send email: ${err.message}`);
  }
}

async function verification(user) {
  await sendEmail({
    to: user.email,
    subject: "Verify your account",
    text: verifyMailText
      .replace(/{{verification}}/gim, user.verification_token)
      .replace(/{{domain}}/gm, env.DEFAULT_DOMAIN)
      .replace(/{{site_name}}/gm, env.SITE_NAME),
    html: verifyEmailTemplate.replace(/{{verification}}/gim, user.verification_token)
  });
}

async function changeEmail(user) {
  await sendEmail({
    to: user.change_email_address,
    subject: "Verify your new email address",
    text: changeEmailText
      .replace(/{{verification}}/gim, user.change_email_token)
      .replace(/{{domain}}/gm, env.DEFAULT_DOMAIN)
      .replace(/{{site_name}}/gm, env.SITE_NAME),
    html: changeEmailTemplate.replace(/{{verification}}/gim, user.change_email_token)
  });
}

async function resetPasswordToken(user) {
  await sendEmail({
    to: user.email,
    subject: "Reset your password",
    text: resetMailText
      .replace(/{{resetpassword}}/gm, user.reset_password_token)
      .replace(/{{domain}}/gm, env.DEFAULT_DOMAIN),
    html: resetEmailTemplate.replace(/{{resetpassword}}/gm, user.reset_password_token)
  });
}

async function sendReportEmail(link) {
  const text = `
New Link Report

Reported link: ${link}

Please review this report as soon as possible.
    `;
  
  await sendEmail({
    to: env.REPORT_EMAIL,
    subject: "[LINK REPORT] Potential abuse / phishing",
    text,
    html: reportEmailTemplate.replace(/{{link}}/gm, link),
  });
}

module.exports = {
  changeEmail,
  verification,
  resetPasswordToken,
  sendReportEmail,
};
