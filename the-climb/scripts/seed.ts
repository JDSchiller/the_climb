import { seedIfEmpty } from "../lib/seed";

seedIfEmpty(process.env.FORCE_SEED === "true")
  .then((r) => {
    if (!r.seeded) {
      console.log("Database already has data. Skipping seed. Set FORCE_SEED=true to wipe and reseed.");
      return;
    }
    console.log("Seeded.");
    console.log("Logins (sandbox shows the code on screen):");
    console.log("  Guardian/manager: jordan@example.com  (or +14075550100)");
    console.log("  Athlete:          kohen@example.com   (or +14075550101)");
    console.log("  Scoping test:     demo@example.com    (sees only Finn Osei)");
    console.log(`Coach Bardaro's live check-in link: ${r.coachLink}`);
  })
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
