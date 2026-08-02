-- Agenda o envio dos lembretes de Web Push de hora em hora. A Edge Function
-- (send-web-push-reminders) decide, pra cada inscrição, se a hora local dela
-- bate com 7h/12h/22h antes de mandar qualquer coisa — o cron só bate na
-- porta a cada hora cheia.
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select
  cron.schedule(
    'send-web-push-reminders-hourly',
    '0 * * * *',
    $$
    select net.http_post(
      url := 'https://covtpwbaghvrbfxyirga.supabase.co/functions/v1/send-web-push-reminders',
      headers := jsonb_build_object('Content-Type', 'application/json')
    );
    $$
  )
where not exists (
  select 1 from cron.job where jobname = 'send-web-push-reminders-hourly'
);
