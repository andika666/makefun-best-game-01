// Pickups: rare drops from elites and bosses. A heart heals, a magnet
// vacuums every ember on the field, a nova burns every wisp in sight.
// One file, one job: what a pickup is and what it does when taken.

export const PICKUP_DEFS = {
  heart: { name: 'Heart', color: '#ff6b81', radius: 13 },
  magnet: { name: 'Magnet', color: '#7ee7ff', radius: 13 },
  nova: { name: 'Nova', color: '#ffd166', radius: 13 },
};

/** Create a pickup of a kind at a position. */
export function makePickup(kind, x, y) {
  return { kind, x, y, bob: 0, life: 14 };
}

/** Apply a pickup's effect to the world. */
export function applyPickup(world, pickup) {
  const player = world.player;
  if (pickup.kind === 'heart') {
    player.heal(25);
    world.floatText(player.x, player.y - 30, '+25 HP', '#7ee787');
  } else if (pickup.kind === 'magnet') {
    world.magnetTimer = 3;
    world.floatText(player.x, player.y - 30, 'EMBER MAGNET!', '#7ee7ff');
  } else if (pickup.kind === 'nova') {
    world.novaBurst(player.x, player.y, 520, 70);
    world.floatText(player.x, player.y - 30, 'NOVA!', '#ffd166');
  }
  world.audio.powerup();
}
