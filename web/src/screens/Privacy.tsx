import { Bullets, Callout, CONTACT_EMAIL, LegalPage, Section } from './LegalPage';

// Content here is written to match what the code actually does — if you change
// what gets collected, stored, or sent to a third party, change this too.
// Notably: server/src/db/index.ts (what's stored), server/src/routes/auth.ts
// (what Google gives us), server/src/bot/client.ts (messages -> OpenRouter),
// web/src/firebase.ts (analytics + push).
export function Privacy() {
  return (
    <LegalPage title="Privacy Policy" updated="17 August 2026">
      <Section heading="The short version">
        Botcha collects as little as it can get away with. We never receive your email address, your
        real name, or your Google profile picture. We don't sell your data, we don't run ad networks,
        and there is no third-party tracking beyond Google's own analytics and push services described
        below.
        <Callout>
          One thing worth knowing up front: the messages you type during a game are sent to an AI
          provider so the bot can reply in context. Don't type anything private into a Botcha table.
        </Callout>
      </Section>

      <Section heading="What we collect">
        <Bullets
          items={[
            <>
              <b>A Google account identifier.</b> When you sign in with Google, we receive an opaque
              account ID (Google calls it a "subject identifier"). We store only that. We do not
              request or store your email address, name, or profile photo.
            </>,
            <>
              <b>Your nickname and avatar.</b> You choose both. They're shown to other players on the
              pre-game roster and after the reveal — pick a nickname you're comfortable showing
              strangers.
            </>,
            <>
              <b>Your chat messages.</b> Every message you send during a game is stored so the game can
              show the transcript afterwards.
            </>,
            <>
              <b>Gameplay records.</b> Games played, guesses made, wins and losses, Score, Coins, and
              Hearts.
            </>,
            <>
              <b>A push notification token</b>, but only if you allow notifications. It identifies your
              browser, not you.
            </>,
            <>
              <b>Usage analytics</b> via Google Analytics for Firebase: which screens you reach and
              which game events fire. Google's SDK also collects standard technical data such as
              device type, general region derived from IP address, and a randomly generated
              installation ID.
            </>
          ]}
        />
      </Section>

      <Section heading="What we don't collect">
        <Bullets
          items={[
            'Your email address or real name.',
            'Payment information — there is nothing to buy.',
            'Precise location, contacts, photos, or any device permission beyond optional notifications.'
          ]}
        />
      </Section>

      <Section heading="Who your data is shared with">
        Three service providers, and nobody else. We do not sell or rent personal data.
        <Bullets
          items={[
            <>
              <b>Google</b> — for Sign-In, analytics, and push notifications. Governed by Google's own
              privacy policy.
            </>,
            <>
              <b>OpenRouter</b>, and through them the AI model provider that generates bot replies.
              Your in-game chat messages are sent to them so the bot can respond in context. They are
              sent without your nickname or account ID attached — the bot sees only anonymous seat
              names like "Blue Fox".
            </>,
            <>
              <b>Other players at your table</b> — they see your seat's messages during the game, and
              your nickname and avatar on the roster and reveal screens. They never learn which seat
              belongs to which nickname until the reveal.
            </>
          ]}
        />
      </Section>

      <Section heading="Where it's stored, and for how long">
        Botcha runs on a single server we operate, and stores data in a database on that server. Game
        records and messages are kept indefinitely so leaderboards and history stay accurate. Live
        game state exists only in memory and is gone the moment a game ends.
      </Section>

      <Section heading="Your choices">
        <Bullets
          items={[
            <>
              <b>Notifications</b> are off until you allow them, and you can revoke that permission in
              your browser at any time.
            </>,
            <>
              <b>Deletion.</b> Email us at {CONTACT_EMAIL} and we'll delete your account and its
              associated records. Messages you sent may remain visible in other players' game
              transcripts, since those are part of their game history too.
            </>,
            <>
              <b>Access.</b> Ask us and we'll tell you what we hold about you.
            </>
          ]}
        />
      </Section>

      <Section heading="Children">
        Botcha isn't intended for children under 13 (or under 16 in the EEA and UK). We don't
        knowingly collect data from them. If you believe a child has created an account, contact us
        and we'll remove it.
      </Section>

      <Section heading="Changes">
        If this policy changes in a way that materially affects you, we'll update the date at the top
        of this page. Continuing to play after a change means you accept it.
      </Section>

      <Section heading="Contact">
        Questions, deletion requests, or complaints: {CONTACT_EMAIL}
      </Section>
    </LegalPage>
  );
}
