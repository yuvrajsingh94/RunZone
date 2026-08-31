import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional
from app.core.config import settings


class EmailService:
    """
    Enterprise Transactional Email Service.
    Supports SMTP/SendGrid delivery in production and secure local dev logging in development.
    """

    @classmethod
    def send_email(
        cls,
        to_email: str,
        subject: str,
        html_body: str,
        text_body: str,
    ) -> bool:
        if not settings.EMAIL_ENABLED or not settings.SMTP_HOST:
            # Development Mode: Log email delivery details cleanly to server stdout
            print("\n" + "=" * 60)
            print(f"[DEV TRANSACTIONAL EMAIL MAILER]")
            print(f"To: {to_email}")
            print(f"From: {settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL}>")
            print(f"Subject: {subject}")
            print("-" * 60)
            print(text_body.strip())
            print("=" * 60 + "\n")
            return True

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL}>"
            msg["To"] = to_email

            part1 = MIMEText(text_body, "plain", "utf-8")
            part2 = MIMEText(html_body, "html", "utf-8")

            msg.attach(part1)
            msg.attach(part2)

            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
                if settings.SMTP_TLS:
                    server.starttls()
                if settings.SMTP_USER and settings.SMTP_PASSWORD:
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.EMAILS_FROM_EMAIL, [to_email], msg.as_string())
            return True
        except Exception as e:
            print(f"[Email Error] Failed to send email to {to_email}: {e}")
            return False

    @classmethod
    def send_verification_email(cls, to_email: str, username: str, token: str) -> bool:
        verify_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
        subject = "Verify Your RunZone Athlete Account"
        text_body = f"""
Hello {username},

Welcome to RunZone! Please verify your email address by visiting the link below:

{verify_url}

If you did not sign up for RunZone, please ignore this email.
"""
        html_body = f"""
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background-color: #14181A; color: #EDEEE7; padding: 24px;">
  <div style="max-width: 500px; margin: auto; background-color: #1B2023; border: 1px solid rgba(237,238,231,0.1); padding: 24px; border-radius: 4px;">
    <h2 style="color: #EDEEE7; margin-top: 0;">Welcome to RunZone, {username}!</h2>
    <p style="color: #9BA1A6; font-size: 14px; line-height: 1.5;">
      Confirm your athlete account to start capturing PostGIS territory corridors and activating ZoneCoach AI training plans.
    </p>
    <div style="margin: 24px 0;">
      <a href="{verify_url}" style="background-color: #B8492E; color: #EDEEE7; padding: 12px 24px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
        VERIFY EMAIL ADDRESS
      </a>
    </div>
    <p style="color: #656C71; font-size: 12px;">Or copy and paste this URL into your browser: <br>{verify_url}</p>
  </div>
</body>
</html>
"""
        return cls.send_email(to_email, subject, html_body, text_body)

    @classmethod
    def send_password_reset_email(cls, to_email: str, username: str, token: str) -> bool:
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
        subject = "Reset Your RunZone Password"
        text_body = f"""
Hello {username},

We received a request to reset your RunZone account password. Use the link below to set a new password (valid for 30 minutes):

{reset_url}

If you did not request a password reset, you can safely disregard this message.
"""
        html_body = f"""
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background-color: #14181A; color: #EDEEE7; padding: 24px;">
  <div style="max-width: 500px; margin: auto; background-color: #1B2023; border: 1px solid rgba(237,238,231,0.1); padding: 24px; border-radius: 4px;">
    <h2 style="color: #EDEEE7; margin-top: 0;">Password Reset Request</h2>
    <p style="color: #9BA1A6; font-size: 14px; line-height: 1.5;">
      You requested to reset your password for your athlete account ({username}). This link is valid for 30 minutes.
    </p>
    <div style="margin: 24px 0;">
      <a href="{reset_url}" style="background-color: #B8492E; color: #EDEEE7; padding: 12px 24px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
        RESET PASSWORD
      </a>
    </div>
    <p style="color: #656C71; font-size: 12px;">Link: {reset_url}</p>
  </div>
</body>
</html>
"""
        return cls.send_email(to_email, subject, html_body, text_body)
