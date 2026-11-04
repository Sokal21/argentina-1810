# El apestado poseído

The first part of the Wekufe's fight (`arg-tsr`): a plague-dead soldier ([apestado](apestado.md)) with the
Wekufe in him. A concept, proposed to the user on 30 October 2026 and shown in `modelos.html` as
"Apestado poseído" (`src/three/poseido.ts`); not yet agreed, not in the game.

## How he looks
The apestado's own model and clips, drawn 125 (the apestado 100, the Wekufe 150):
- Nearly black all over, the uniform still to be made out; what shone green in him shines red.
- Two ram's horns of plain geometry held by his head bone, coming through his kepi, the right one broken.
- Two red eyes, drawn through his brow (his model has none to light), not seen when he looks away.
- Black smoke and tongues of black fire with the Wekufe's red dodge off his shoulders and back, for the green stench.

## Being possessed (`agonia` in the gallery)
The user's choice: the Wekufe's agony (Zombie Agonizing, 3.2 s) and a black cloud wrapping him. He starts as the apestado, green and 0.8 of his size; the cloud climbs him from the ground as he writhes, is thickest about halfway, and thins away by 0.9 of the clip. He goes black and red little by little, from 0.15 to 0.7 of it, his horns growing as he does (the user: not all at once; at first he was changed in a moment under the cloud); dying, he goes back to his own colours so. Tongues of black fire, a faint red within them, lick up through it (the user).

## Coming into a dead one (`poseer` in the gallery, `SUMMON`)
Lying as a dead apestado, a rope of black smoke and souls comes over to him and goes into him (1.4 s); he gets up out of it (Mixamo's Getting Up, the user's, 4 November 2026: `levantado`, frames 1 to 155, `--ground`, quickened 1.6 times), possessed as he does under the cloud, and goes through his agony. In the gallery only as yet: in the game he still goes from lying straight to his agony.

## His leap (`salto` in the gallery, `LEAP`)
Mixamo's Mutant Jump Attack (the user's, 3 November 2026; 115 frames): he crouches (0.4 s), springs high (the capture's own height, scaled to his legs) and forward nearly twice his height in 0.5 s (the user: longer and quicker, or it is too easily got out of the way of; captured, 0.5 and 1.2 s and half as far), lands and brings both hands down on the ground at frame 51. A red ring fills on the ground where he will land until the blow; then it goes out from his hands, with red cracks, black dust and fire, and the screen is jolted. Before it, Standing 2H Magic Area Attack 01 with a jump made in code (rough: he landed sideways with no real crouch) and Hard Landing (he only crouched) were tried.

## His retching (`vomitar` in the gallery, `Bile`)
The apestado's, the same pool and the same spray (three/vomit.ts), as the Wekufe has made it (the user, 4 November 2026): black bile with a little red glowing in it, the pool a black tar with embers, grey smoke rising from it and little red tongues of fire licking up. In the game it is to slow and burn as the apestado's slows and poisons; perhaps burning more and slowing less. The Wekufe's black fire and dodge were tried on it and not seen: on the black pool there is nothing under them to brighten.

## His death (`muerte` in the gallery, `DEATH`)
His own clip, falling; a black cloud gathers on him and hides the change: under it his horns and eyes go, he dwindles to 0.8 and lies as a green dead apestado. The Wekufe leaves by his mouth, a rope of black smoke and souls of black fire with the red dodge, arcing off to the next body (`DEATH.next`, 1.9 of his height to one side; nothing stands there in the gallery yet). 4.2 s in all. His body stays where it fell till the end of the fight (the user).

## How he fights (`KINDS.poseido` in `src/tropa/brain.ts`; not yet in the game)
The apestado's brain, with all his powers (the user, 30 October 2026) and a leap; drawn 125, life 22 (his 14), pace 44 (his 34), his blow and charge reaching a little further.
- **Being possessed** (`possess`): 3.2 s, his agony; not to be struck for the first 2.9, while the cloud is on him.
- **His blow** up close, as the apestado's (3).
- **His retching**, the black bile, from 80 to 320 off, every 5 s. First he warns for 0.7 s, still turning after her, his head held back and a red glow and glint (the royalists' warning, larger) growing at his mouth; then he retches the way he faces (the user, 4 November 2026: so it is seen coming and can be got out of the way of).
- **His charge**, from 150 to 380, every 7 s. His legs keep running under his swipe as he comes in, as the apestado's do (he slid at the end of it: the user).
- **His leap**, from 120 to 300 off (and a little past, coming down 300 off): where he will land is fixed as he crouches, where she stood; 0.4 s crouched, 0.5 s in the air, then the blow on the ground, taking 3 from her if she is within 75 of where he lands; 1.6 s getting up; every 6 s. It gives the ring's place as it begins (`leap`) and the blow as he lands (`slam`).
- **Three of him** (`possessed(nth)`): alike, each quicker than the one before (1, 1.12, 1.25: on his feet, and how soon he blows, retches, charges and leaps again). Proposed by Claude and coded so; the user has not said otherwise.

In the game (4 November 2026: `GameScene.musterWekufe` and `fightPossessed`, `src/three/poseidoFigure.ts` drawing him): three lie dead before her on Inti's clearing; the Wekufe comes into the first at once, and into the next as each dies (his smoke going to it, 3.9 s), the dead left lying to the end; from the last he goes to where he stands himself, and the second part begins. Each possessed is lent two chonchones as the Wekufe comes into him, which are not back once down and are brought down when the Wekufe stands himself (the user: chonchones only in this part). His blow on the ground jolts the screen and takes 3 from her if she is in its ring (a roll gets her out of it, as out of any blow); his bile slows her to 0.8 (the apestado's 0.6) and burns 1 over 3 s (the plague's 0.5 over 4), and she throbs the red of fire while it does (green at first: the user had it red). Rough still: he gets up from lying to his agony with a jump in his pose, under the first of the cloud.
