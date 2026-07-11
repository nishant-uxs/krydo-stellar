export async function seedDatabase() {
  // Import Firebase only when seeding — keeps Vercel cold-start imports side-effect free.
  await import("./db");
  console.log("Firestore ready. No seed data - all data comes from real wallet connections and blockchain operations.");
}
