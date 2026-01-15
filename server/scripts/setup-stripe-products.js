#!/usr/bin/env node

/**
 * Stripe Products Setup Script
 * 
 * Erstellt automatisch die benötigten Stripe Produkte und Price IDs
 * für State of the Dart
 * 
 * Usage:
 *   node scripts/setup-stripe-products.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Check if Stripe key is set
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ ERROR: STRIPE_SECRET_KEY nicht in .env gefunden!');
  console.error('');
  console.error('Bitte füge in server/.env hinzu:');
  console.error('STRIPE_SECRET_KEY=sk_live_...');
  process.exit(1);
}

// Check if using test key (warning)
if (process.env.STRIPE_SECRET_KEY.startsWith('sk_test_')) {
  console.warn('⚠️  WARNING: Du verwendest einen TEST-Key!');
  console.warn('Für Production verwende einen LIVE-Key (sk_live_...)');
  console.warn('');
}

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function setupProducts() {
  console.log('🚀 Erstelle Stripe Produkte...\n');

  try {
    // 1. Monthly Subscription Product
    console.log('📦 Erstelle "Monthly Subscription"...');
    const monthlyProduct = await stripe.products.create({
      name: 'State of the Dart - Monthly Subscription',
      description: 'Monatliches Abonnement für vollen Zugriff auf alle Features',
      metadata: {
        type: 'subscription',
        app: 'state-of-the-dart'
      }
    });
    console.log(`✅ Product erstellt: ${monthlyProduct.id}`);

    // Create Monthly Price
    const monthlyPrice = await stripe.prices.create({
      product: monthlyProduct.id,
      unit_amount: 999, // 9.99 EUR in Cents
      currency: 'eur',
      recurring: {
        interval: 'month'
      },
      metadata: {
        type: 'monthly',
        app: 'state-of-the-dart'
      }
    });
    console.log(`✅ Price erstellt: ${monthlyPrice.id} (9,99 EUR/Monat)\n`);

    // 2. Lifetime Access Product
    console.log('📦 Erstelle "Lifetime Access"...');
    const lifetimeProduct = await stripe.products.create({
      name: 'State of the Dart - Lifetime Access',
      description: 'Einmalige Zahlung für lebenslangen Zugriff',
      metadata: {
        type: 'lifetime',
        app: 'state-of-the-dart'
      }
    });
    console.log(`✅ Product erstellt: ${lifetimeProduct.id}`);

    // Create Lifetime Price
    const lifetimePrice = await stripe.prices.create({
      product: lifetimeProduct.id,
      unit_amount: 9900, // 99.00 EUR in Cents
      currency: 'eur',
      metadata: {
        type: 'lifetime',
        app: 'state-of-the-dart'
      }
    });
    console.log(`✅ Price erstellt: ${lifetimePrice.id} (99,00 EUR einmalig)\n`);

    // 3. Display Results
    console.log('═══════════════════════════════════════════════════════');
    console.log('🎉 ERFOLG! Alle Produkte wurden erstellt!');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('📋 Trage diese Price IDs in deine .env ein:\n');
    console.log('STRIPE_PRICE_ID_MONTHLY=' + monthlyPrice.id);
    console.log('STRIPE_PRICE_ID_LIFETIME=' + lifetimePrice.id);
    console.log('');

    // 4. Auto-update .env file
    const envPath = path.join(__dirname, '..', '.env');
    
    if (fs.existsSync(envPath)) {
      console.log('🔧 Aktualisiere .env Datei...');
      
      let envContent = fs.readFileSync(envPath, 'utf8');
      
      // Replace or add Monthly Price ID
      if (envContent.includes('STRIPE_PRICE_ID_MONTHLY=')) {
        envContent = envContent.replace(
          /STRIPE_PRICE_ID_MONTHLY=.*/,
          `STRIPE_PRICE_ID_MONTHLY=${monthlyPrice.id}`
        );
      } else {
        envContent += `\nSTRIPE_PRICE_ID_MONTHLY=${monthlyPrice.id}`;
      }
      
      // Replace or add Lifetime Price ID
      if (envContent.includes('STRIPE_PRICE_ID_LIFETIME=')) {
        envContent = envContent.replace(
          /STRIPE_PRICE_ID_LIFETIME=.*/,
          `STRIPE_PRICE_ID_LIFETIME=${lifetimePrice.id}`
        );
      } else {
        envContent += `\nSTRIPE_PRICE_ID_LIFETIME=${lifetimePrice.id}`;
      }
      
      fs.writeFileSync(envPath, envContent);
      console.log('✅ .env wurde automatisch aktualisiert!\n');
    }

    // 5. Next Steps
    console.log('───────────────────────────────────────────────────────');
    console.log('📚 Nächste Schritte:');
    console.log('───────────────────────────────────────────────────────');
    console.log('1. ✅ Prüfe deine .env Datei');
    console.log('2. ⚡ Starte den Server neu: npm run dev');
    console.log('3. 🧪 Teste den Checkout Flow');
    console.log('4. 🔔 Richte Stripe Webhooks ein (siehe SETUP.md)');
    console.log('');
    console.log('🔗 Stripe Dashboard:');
    console.log('   https://dashboard.stripe.com/products');
    console.log('');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error('');
    console.error('Mögliche Ursachen:');
    console.error('- Falscher API Key');
    console.error('- Keine Internet-Verbindung');
    console.error('- Stripe API Problem');
    console.error('');
    console.error('Details:', error);
    process.exit(1);
  }
}

// Run the script
setupProducts();
