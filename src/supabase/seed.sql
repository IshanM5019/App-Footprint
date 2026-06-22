-- ============================================================
-- Footprints — Seed Data
-- ============================================================
-- PREREQUISITE: Create 7 users via Supabase Auth (Dashboard or API)
-- first, then replace the UUIDs below with the actual user IDs.
--
-- User 1 (testuser / Explorer) = YOUR test account
-- Users 2-7 = test friends
-- ============================================================

DO $$
DECLARE
  -- Replace these UUIDs with real auth.users IDs after creating accounts
  uid_me      UUID := '00000000-0000-0000-0000-000000000001';
  uid_alex    UUID := '00000000-0000-0000-0000-000000000002';
  uid_maya    UUID := '00000000-0000-0000-0000-000000000003';
  uid_ravi    UUID := '00000000-0000-0000-0000-000000000004';
  uid_sophie  UUID := '00000000-0000-0000-0000-000000000005';
  uid_james   UUID := '00000000-0000-0000-0000-000000000006';
  uid_yuki    UUID := '00000000-0000-0000-0000-000000000007';

  -- Footprint IDs (for conversation linking)
  fp_lodhi      UUID := gen_random_uuid();
  fp_bluetokai  UUID := gen_random_uuid();
  fp_karims     UUID := gen_random_uuid();
  fp_ngma       UUID := gen_random_uuid();
  fp_pianoman   UUID := gen_random_uuid();
  fp_indiagate  UUID := gen_random_uuid();
  fp_humayuns   UUID := gen_random_uuid();
  fp_olive      UUID := gen_random_uuid();

  -- Conversation IDs
  conv1 UUID := gen_random_uuid();
  conv2 UUID := gen_random_uuid();
  conv3 UUID := gen_random_uuid();
  conv4 UUID := gen_random_uuid();
  conv5 UUID := gen_random_uuid();
BEGIN

-- ── Profiles ─────────────────────────────────────────────────
-- (Only insert if not already created by the auth trigger)

INSERT INTO profiles (id, username, full_name) VALUES
  (uid_me,     'testuser',      'Explorer'),
  (uid_alex,   'alexchen',      'Alex Chen'),
  (uid_maya,   'mayapark',      'Maya Park'),
  (uid_ravi,   'ravipatel',     'Ravi Patel'),
  (uid_sophie, 'sophielaurent', 'Sophie Laurent'),
  (uid_james,  'jameswilson',   'James Wilson'),
  (uid_yuki,   'yukitanaka',    'Yuki Tanaka')
ON CONFLICT (id) DO NOTHING;

-- ── Location Drafts (for the test user, all pending) ─────────

INSERT INTO location_drafts (user_id, venue_name, address, category, latitude, longitude, visited_at, status) VALUES
  (uid_me, 'Glen''s Bakehouse', 'Toit Road, Indiranagar, Bengaluru, Karnataka', 'cafe', 12.9784, 77.6416, now() - interval '3 hours', 'pending'),
  (uid_me, 'Cubbon Park', 'Kasturba Road, Bengaluru, Karnataka', 'park', 12.9779, 77.5952, now() - interval '1 hour', 'pending'),
  (uid_me, 'Bangalore Palace', 'Vasanth Nagar, Bengaluru, Karnataka', 'landmark', 12.9982, 77.5920, now() - interval '1 day', 'pending'),
  (uid_me, 'Toit Beer Co', 'Indiranagar, Bengaluru, Karnataka', 'restaurant', 12.9791, 77.6407, now() - interval '1 day 6 hours', 'pending'),
  (uid_me, 'Vidhana Soudha', 'Ambedkar Veedhi, Bengaluru, Karnataka', 'landmark', 12.9796, 77.5906, now() - interval '1 day 10 hours', 'pending'),
  (uid_me, 'Visvesvaraya Industrial Museum', 'Kasturba Road, Bengaluru, Karnataka', 'museum', 12.9754, 77.5963, now() - interval '2 days', 'pending'),
  (uid_me, 'Truffles', 'Koramangala 5th Block, Bengaluru, Karnataka', 'restaurant', 12.9341, 77.6134, now() - interval '2 days 3 hours', 'pending'),
  (uid_me, 'Third Wave Coffee', 'Sector 7, HSR Layout, Bengaluru, Karnataka', 'cafe', 12.9103, 77.6415, now() - interval '3 days', 'pending');

-- ── Public Footprints (from friends) ─────────────────────────

INSERT INTO public_footprints (id, user_id, venue_name, address, category, latitude, longitude, review_text, pinned_at) VALUES
  (fp_lodhi,     uid_alex,   'Lodhi Garden',                   'Lodhi Road, Lodhi Estate, New Delhi, Delhi', 'park',       28.5933, 77.2198, 'A beautiful city park with historic tombs from the Lodi dynasty, landscaped gardens, and a peaceful atmosphere.', now() - interval '2 days'),
  (fp_indiagate, uid_alex,   'India Gate',                     'Rajpath, Central Secretariat, New Delhi, Delhi', 'landmark', 28.6129, 77.2295, 'An iconic triumphal arch war memorial, popular for evening walks, street food vendors, and illuminated gardens.', now() - interval '12 hours'),
  (fp_bluetokai, uid_maya,   'Blue Tokai Coffee Roasters',     'M-Block, Connaught Place, New Delhi, Delhi', 'cafe',             28.6304, 77.2177, 'Modern specialty coffee shop with locally roasted Indian beans, great sourdough toasts, and a cozy workspace vibe.', now() - interval '1 day'),
  (fp_olive,     uid_maya,   'Olive Bar & Kitchen',            'One Style Mile, Mehrauli, New Delhi, Delhi', 'restaurant',  28.5256, 77.1844, 'Beautiful Mediterranean style alfresco dining set under a huge banyan tree near the Qutub Minar.', now() - interval '6 hours'),
  (fp_karims,    uid_ravi,   'Karim''s, Old Delhi',            'Gali Kababian, Jama Masjid, Old Delhi, Delhi', 'restaurant', 28.6508, 77.2335, 'Legendary Mughlai restaurant serving famous mutton korma, seekh kebabs, and tandoori rotis since 1913.', now() - interval '3 days'),
  (fp_ngma,      uid_sophie, 'National Gallery of Modern Art', 'Jaipur House, Sher Shah Road, New Delhi, Delhi', 'museum',      28.6096, 77.2344, 'Lush art museum showcasing historic paintings by Raja Ravi Varma, Amrita Sher-Gil, and modern Indian artists.', now() - interval '4 days'),
  (fp_pianoman,  uid_james,  'The Piano Man Jazz Club',        'Safdarjung Enclave Market, New Delhi, Delhi', 'bar',     28.5638, 77.2001, 'A cozy multi-level jazz bar with live musical performances, woodfired pizzas, and classic cocktail menus.', now() - interval '1 day'),
  (fp_humayuns,  uid_yuki,   'Humayun''s Tomb',                'Nizamuddin East, New Delhi, Delhi', 'landmark', 28.5933, 77.2507, 'Stunning 16th-century Mughal mausoleum with symmetrical charbagh gardens and red sandstone architecture.', now() - interval '5 days');

-- ── Conversations ────────────────────────────────────────────

INSERT INTO conversations (id, footprint_id) VALUES
  (conv1, fp_lodhi),
  (conv2, fp_bluetokai),
  (conv3, fp_ngma),
  (conv4, fp_pianoman),
  (conv5, fp_karims);

-- ── Conversation Participants ────────────────────────────────

INSERT INTO conversation_participants (conversation_id, user_id) VALUES
  (conv1, uid_me), (conv1, uid_alex),
  (conv2, uid_me), (conv2, uid_maya),
  (conv3, uid_me), (conv3, uid_sophie),
  (conv4, uid_me), (conv4, uid_james),
  (conv5, uid_me), (conv5, uid_ravi);

-- ── Messages ─────────────────────────────────────────────────

-- Conv 1: Alex about Lodhi Garden
INSERT INTO messages (conversation_id, sender_id, text_content, created_at) VALUES
  (conv1, uid_alex, 'Hey! I saw you pinned Lodhi Garden. I was there last week!', now() - interval '2 hours'),
  (conv1, uid_me,   'Yes! It was absolutely stunning. Did you see the tomb section?', now() - interval '1 hour 58 minutes'),
  (conv1, uid_alex, 'Of course! The lake is my favorite. Best time to go is early morning around 7am.', now() - interval '1 hour 57 minutes'),
  (conv1, uid_me,   'Good tip! I went around noon and it was pretty crowded.', now() - interval '1 hour 55 minutes'),
  (conv1, uid_alex, 'The gardens were incredible!', now() - interval '1 hour 54 minutes'),
  (conv1, uid_alex, 'I''ll send you some photos from my visit', now() - interval '1 hour 54 minutes');

-- Conv 2: Maya about Blue Tokai
INSERT INTO messages (conversation_id, sender_id, text_content, created_at) VALUES
  (conv2, uid_me,   'Maya! Is the Blue Tokai in Connaught Place worth the hype?', now() - interval '3 hours'),
  (conv2, uid_maya,  'Absolutely. It''s one of the best specialty cafes.', now() - interval '2 hours 55 minutes'),
  (conv2, uid_maya,  'Their cold brew is a must-try', now() - interval '2 hours 54 minutes');

-- Conv 3: Sophie about NGMA
INSERT INTO messages (conversation_id, sender_id, text_content, created_at) VALUES
  (conv3, uid_me,     'Sophie, I''m thinking of going to the National Gallery of Modern Art tomorrow. Any tips?', now() - interval '5 hours'),
  (conv3, uid_sophie, 'Oh you HAVE to go! It''s a very peaceful and beautiful gallery.', now() - interval '4 hours 45 minutes'),
  (conv3, uid_sophie, 'They have a beautiful cafe section and some amazing modern Indian collections.', now() - interval '4 hours 44 minutes'),
  (conv3, uid_sophie, 'It is quite relaxing, no long queues at all.', now() - interval '4 hours 43 minutes');

-- Conv 4: James about The Piano Man
INSERT INTO messages (conversation_id, sender_id, text_content, created_at) VALUES
  (conv4, uid_james, 'The Piano Man is an absolute classic. You''ll love it.', now() - interval '1 day'),
  (conv4, uid_me,    'Any specific seats you''d recommend?', now() - interval '23 hours 55 minutes'),
  (conv4, uid_james, 'Try to book a table on the balcony section', now() - interval '23 hours 50 minutes');

-- Conv 5: Ravi about Karim's
INSERT INTO messages (conversation_id, sender_id, text_content, created_at) VALUES
  (conv5, uid_ravi, 'Karim''s is still the best for mutton korma in Delhi!', now() - interval '2 days'),
  (conv5, uid_me,   'Better than the other places nearby?', now() - interval '1 day 23 hours 55 minutes'),
  (conv5, uid_ravi, 'For foodies, yes. Unmatched Mughlai heritage.', now() - interval '1 day 23 hours 50 minutes'),
  (conv5, uid_ravi, 'The seekh kebabs are legendary 🍢', now() - interval '1 day 23 hours 48 minutes');

END $$;
