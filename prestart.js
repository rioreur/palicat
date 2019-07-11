// Their is an exploit where you can laod an infinite amount of vigor wasp by changing pets (reset the memory of th epalicat)

/////////////////
// Palicat
/////////////////

// Used so the palicatEntity is loaded insted of the normal sc.PlayerPetEntity
ig.ENTITY.Player.inject({
	// this attribute is used to store the palicat, so its properties are conserved
	palicatEntity: null,
	// We change the way the pet entity is spawn
	updateSkinPet: function(a) {
		// Remove the previous skin
		if (this.skin.pet) {
			this.skin.pet.remove();
			this.skin.pet = null;
		}
		
		var currentSkin = sc.playerSkins.getCurrentSkin("Pet");
		if (currentSkin && currentSkin.loaded) {
			if (currentSkin.name == "Palicat") {
				if (!this.palicatEntity) {
					this.palicatEntity = ig.game.spawnEntity(palicatEntity, 0, 0, 0, {
						petSkin: currentSkin
						}, a || false);
				}
				this.skin.pet = this.palicatEntity;
				this.skin.pet.show();
			} else {
				this.skin.pet = ig.game.spawnEntity(sc.PlayerPetEntity, 0, 0, 0, {
					petSkin: currentSkin
					}, a || false)
			}
			
		}
	}
});

// This is the entity that is use for the AI of the palicat
// (problem possible with ig.QuickSand)
// note : 	the "currentAction" attribute seems to only refer to the player petting the entity for now.
//			Could be a good idea to use this to make the palicat place a vigorWasp
var b = new ig.ActorConfig({
		jumpingEnabled: true,
		maxVel: 180,
		weight: 20,
		collType: ig.COLLTYPE.IGNORE,
		walkAnims: "default",
		soundType: "none",
		shadow: 16
	}),
	buffVect2 = Vec2.create(),
	buffVect3 = Vec3.create();
// This class is mostly a copy of the sc.playerPetEntity class
palicatEntity = sc.ActorEntity.extend({
	// New attributes created for the palicat
	vigorWasp: [null],
	vigorWaspTimer: 0,
	attributes: {spawnVigorWasp: false},
	
	npcEffects: new ig.EffectSheet("npc"),
	petSkin: null,
	configs: {},
	pushTimer: 0,
	posOffset: Vec2.createC(0, -14),
	state: 0,
	respawnPos: Vec3.create(),
	idleTimer: 0,
	idleSpecials: 0,
	effects: {
		water: new ig.EffectSheet("scene.water")
	},
	init: function(a, d, f, g) {
		this.parent(a, d, f, g);
		this.coll.setSize(8, 8, 28);
		this.coll.edgeSlipInward = true;
		this.petSkin = g.petSkin;
		this.tempHidden = this.defaultFollow = false;
		this.outOfScreenTime = 0;
		this.animSheet = this.petSkin.animSheet;
		this.storeWalkAnims("default", this.petSkin.walkAnims);
		this.setWalkAnims("default");
		for (a = 0; this.animSheet.hasAnimation("idleSpecial" + (a + 1));) a = a + 1;
		(this.idleSpecials = a) && this.resetIdleTimer();
		a = new ig.ActorConfig;
		a.loadFromData(this.petSkin.actorConfig, b);
		this.setDefaultConfig(a);
		this.initAnimations()
	},
	show: function(a) {
		this.parent(a);
		this.resetPos(a)
	},
	resetIdleTimer: function(a) {
		this.idleTimer = 2 + 2 * Math.random() + (a || 0)
	},
	resetStartPos: function() {
		var b = ig.game.playerEntity;
		Vec3.assign(buffVect3, b.coll.pos);
		buffVect3.x = buffVect3.x + (b.coll.size.x / 2 - this.coll.size.x / 2);
		buffVect3.y = buffVect3.y + (b.coll.size.y / 2 - this.coll.size.x / 2);
		b = Vec2.assign(buffVect2, b.face);
		Vec2.length(b, 12);
		buffVect3.x = buffVect3.x - b.x;
		buffVect3.y = buffVect3.y - b.y;
		this.coll.setPos(buffVect3.x, buffVect3.y, buffVect3.z)
	},
	resetPos: function(a, b) {
		var f = ig.game.playerEntity,
			f = ig.navigation.getClosePosition(buffVect3, f.getAlignedPos(ig.ENTITY_ALIGN.BOTTOM, buffVect3), f.coll.size, f, null, 48, 1, 0, ig.NAV_CLOSE_POINT_SEARCH.BEHIND_FACE, false);
		buffVect3.x = buffVect3.x - this.coll.size.x / 2;
		buffVect3.y =
			buffVect3.y - this.coll.size.y / 2;
		!f && b && Vec3.assign(buffVect3, this.respawnPos);
		this.coll.setPos(buffVect3.x, buffVect3.y, buffVect3.z);
		if (!a) {
			this.animState.alpha = 0;
			ig.game.effects.teleport.spawnOnTarget("showFast", this)
		}
	},
	onNavigationFailed: function(a) {
		if (a > 5) {
			this.nav.failTimer = 0;
			this.resetPos()
		}
	},
	remove: function() {
		this.hide();
	},
	// We change the update function to add some combat behavior and delete/change others
	update: function() {
		// store to the possible targets
		var playerEntity = ig.game.playerEntity;
		var playerTargetEntity = ig.game.playerEntity.combatStats.lastTarget;
		
		
		// If the pet is not doing any action
		if (!this.currentAction) {
			var currentState = this.state,
				distFromTarget = 0; // use to store the distance from the selected target
			
			// Calculate the distance from the different possible targets
			var distFromPlayerEntity = ig.CollTools.getGroundDistance(this.coll, playerEntity.coll),
				distFromPlayerTarget = 0;
			if (playerTargetEntity)
				distFromPlayerTarget = ig.CollTools.getGroundDistance(this.coll, playerTargetEntity.coll);
				
				
			// Change the target of the palicat
			// In battle
			if (sc.model.isCombatActive() && playerTargetEntity) {
				// The target is the player only if he's really too close or too far
				if (distFromPlayerEntity < 30 || distFromPlayerEntity > 200) {
					this.target = playerEntity;
					distFromTarget = distFromPlayerEntity;
				}
				// Default target is the player targeted enemy
				else {
					this.target = playerTargetEntity;
					distFromTarget = distFromPlayerTarget;
				}
			} 
			// Out of battle
			else {
				// Always the player
				this.target = playerEntity;
				distFromTarget = distFromPlayerEntity;
			}
			
			// Update state according to the distance frome the target, unlock the target if the conditions are met
			if (sc.model.isCombatActive()) {
				if (distFromTarget <= 60 || distFromTarget >= 200) currentState = 2
			}
			else {
				distFromTarget >= 24 && (currentState = 1);
			}
			
			
			// Hide the pet if he needs to be hidden
			var hidePet = playerEntity._hidden || playerEntity.hidePets;
			if (!this.tempHidden && hidePet) {
				this.animState.alpha = 0;
				this.tempHidden = true
			} else if (this.tempHidden && !hidePet) {
				this.tempHidden =
					false;
				this.animState.alpha = 1
			}
			
			// If the pet is not hidden
			if (!this.tempHidden) {
				// Teleport the pet back to the player if we're not in combat or in a cutscene after 3 seconds
				if (!sc.model.isCombatActive() && !sc.model.isCutscene()) {
					this.outOfScreenTime = ig.EntityTools.isInScreen(this, 0) ? 0 : this.outOfScreenTime + ig.system.tick;
					this.outOfScreenTime > 3 && this.resetPos(false, true)
				}
				
				// If the state has changed
				if (this.state !== currentState) {
					this.state = currentState;
					// We make the pet follow closely the player ("follow closely" state)
					if (currentState === 1) {
						if (!this.defaultFollow) {
							this.nav.path.toEntity(this.target, 16, {
								posOffset: this.posOffset
							});
							this.defaultFollow = true
						}
					// We keep the pet in range by making it run away from the player ("stay in range" state)
					} else if (currentState === 2) {
						this.defaultFollow = false;
						this.nav.path.runAway(this.target, 90)
					}
				}
				// Calculation and update of the pet's velocity depending on the distance from the player
				hasArrived = false;
				velocity = 1;
				if (this.state === 1) {
					velocity = distFromTarget > 48 ?
						1 : Math.max(0.25, Math.pow(distFromTarget / 48, 2));
					distFromTarget > 56 && (velocity = Math.min(1.25, 1.05 + (distFromTarget - 56) / 64));
					this.jumping && (velocity = 1)
				}
				this.coll.relativeVel = velocity;
				this.nav.path.startRelativeVel = velocity;
				
				// Check if the pet arrived at destination
				if (this.state === 1 || this.state === 2) {
					if (this.nav.path.moveEntity()) {
						this.state = 0;
						hasArrived = true;
					}
				} else this.state === 0 && (hasArrived = true);
				// Rotate the entity to face the player if he arrived
				if (hasArrived) {
					distPlayer = ig.CollTools.getDistVec2(this.coll, this.target.coll, buffVect2);
					Vec2.rotateToward(this.face, distPlayer, Math.PI * 2 * ig.system.tick * 2);
				}
				// Update the respawn coordinate
				petColl = this.coll;
				petColl.pos.z <= petColl.baseZPos && (!this.jumping && petColl.zGravityFactor !== 0 && !ig.CollTools.isCloseToEdge(this.coll) && !ig.terrain.isDangerTerrain(this.stepStats.terrain) &&
					this.stepStats.terrain != ig.TERRAIN.QUICKSAND) && Vec3.assign(this.respawnPos, this.coll.pos)
			}
		}
		
		this.parent();
		
		// If their is special idles for the pet, and if he is not doing any action
		if (this.idleSpecials && !this.currentAction)
			// If the entity is not moving (no acceleration)
			if (Vec2.isZero(this.coll.accelDir)) {
				// Make the pet do one of his idle animation (choosen randomly) after 2 secondes
				this.idleTimer = this.idleTimer - ig.system.tick;
				if (this.idleTimer <= 0) {
					idIdleSpecial = Math.floor(this.idleSpecials * Math.random()) + 1;
					this.setCurrentAnim("idleSpecial" + idIdleSpecial, true, this.walkAnims.idle, true);
					this.resetIdleTimer(2)
				}
			} else this.resetIdleTimer();
		
		// If the pet is not hidden and if he is not doing any action
		if (!this.tempHidden && !this.currentAction) {
			// Check for collision and move the pet accordingly
			petColl = this.coll;
			isColliding = false;
			if (petColl.type == ig.COLLTYPE.IGNORE) {
				overlapingEntities = ig.game.getEntitiesInRectangle(
						petColl.pos.x, 
						petColl.pos.y, 
						petColl.pos.z, 
						petColl.size.x, 
						petColl.size.y, 
						petColl.size.z, 
						this);
				for (indexEntity = overlapingEntities.length; indexEntity--;) {
					var h = overlapingEntities[indexEntity];
					if (h instanceof sc.ActorEntity && h.coll.type !== ig.COLLTYPE.TRIGGER) {
						ig.CollTools.getDistVec2(h.coll, petColl, buffVect2);
						Vec2.length(buffVect2, 80 * (1 - this.pushTimer / 1).limit(0, 1));
						Vec2.add(petColl.pushVel, buffVect2);
						isColliding = true
					}
				}
			}
			this.pushTimer = isColliding ? this.pushTimer + ig.system.tick : 0;
			terrainColl = ig.terrain.getTerrain(petColl, true);
			if (ig.terrain.isDangerTerrain(terrainColl) && terrainColl != ig.TERRAIN.QUICKSAND) {
				this.getAlignedPos(ig.ENTITY_ALIGN.BOTTOM, d);
				this.resetPos(false,
					true)
			}
		}

		//////////////////////////////
		// VigorWasp handler
		//////////////////////////////
		
		// If a vigor wasp need to be placed
		if (this.attributes.spawnVigorWasp) {
			var xOffset = 0;
			if (this.face.x > 0) {
				xOffset = 4;
			} else {
				xOffset = -16;
			}
			// Spawn a vigor wasp at the pet's coordinate
			this.vigorWasp.push(ig.game.spawnEntity(VigorWasp, this.coll.pos.x + xOffset, this.coll.pos.y, this.coll.pos.z, {
				name: "",
				desType: "vigorWasp",
			}));
			// Reset the timer
			this.vigorWaspTimer = 15;
			this.attributes.spawnVigorWasp = false;
		}
		
		// If the pet is not in battle, we reset the timer for the vigor wasp
		!sc.model.isCombatActive() && (this.vigorWaspTimer = 3);
		
		// If the pet is in battle and not doing any action
		if (sc.model.isCombatActive() && !this.currentAction) {
			// If their is less than 2 vigor wasp already spawned
			if (this.vigorWasp.length < 2) {
				// Update and check the timer
				this.vigorWaspTimer = this.vigorWaspTimer - ig.system.tick;
				if (this.vigorWaspTimer <= 0) {
					// We change the animation and the state of the entity
					this.setAction(new ig.Action(
						"PLACE_HEAL_STATION",
						[{
							type: "SHOW_ANIMATION",
							anim: "prepareVigorWasp",
							wait: true
						}, {
							type: "SHOW_ANIMATION",
							anim: "placeVigorWasp",
							wait: true
						}, {
							type: "SET_ATTRIB_BOOL",
							name: "spawnVigorWasp",
							value: true
						}, {
							type: "SHOW_ANIMATION",
							anim: "postVigorWasp",
							wait: true
						}, {
							type: "SHOW_ANIMATION",
							anim: "idle"
						}], false, false));
				}
			// If their is more than 2 vigor wasp already spawned
			} else {
				// We splice the killed one out of the list
				for (var i = 0; i < this.vigorWasp.length; i++) {
					if (!this.vigorWasp[i] || this.vigorWasp[i]._killed) {
						this.vigorWasp.splice(i, 1);
					}
				}
				// We reduce the timer unless it's less than 3 seconds
				if (this.vigorWaspTimer > 3)
					this.vigorWaspTimer = this.vigorWaspTimer - ig.system.tick;
			}
		}
	}
});

/////////////////////////
// Vigor Wasp
/////////////////////////

// Definition of the "heal station" destructible item
sc.ITEM_DESTRUCT_TYPE["vigorWasp"] = {
	size: {
		x: 16,
		y: 16,
		z: 22
	},
	effectOffset: {
		x: 0,
		y: 0,
		z: 12
	},
	boom: {
		sheet: "puzzle.destructible",
		name: "small"
	},
	debris: {
		sheet: "area.vigorWasp",
		name: "burstVigorWasp"
	},
	anims: {
		shapeType: "Y_FLAT",
		sheet: {
			src: "mods/palicat/assets/media/entity/objects/vigorWasp-destructibles.png",
			width: 24,
			height: 32,
			offY: 0,
			offX: 0
		},
        dirs: "2",
        flipX: [0, 1],
        tileOffsets: [0, 0],
		SUB: [{
			name: "default",
			time: 0.10,
			repeat: true,
			frames: [0, 1, 2, 3]
		}, {
			name: "default",
			time: 0.10,
			repeat: true,
			frames: [4, 5, 6, 7]
		}]
	}
};

// Definition of the vigorWasp class
VigorWasp = ig.ENTITY.ItemDestruct.extend({
	init: function(a, b, c, e) {
		this.parent(a, b, c, e);
		// Set the entity back to a state where it can be destroyed
		//(stange problem, where a new ItemDestruct entity had the same values as others if their mapId were the same)
		this.unSetDropped(); 
		this.coll.type = ig.COLLTYPE.IGNORE; // So entities can go through it
	},
	isBallDestroyer: function() {
		// We return false everytime so the crosshair (track of the ball) ignore the heal station
		return false
	},
	ballHit: function(a) {
		// if the vigorWasp got hit by a ball, we return false. It should only be destroy by close combat
		if (a.isBall) return false;
		this.parent(a);
	},
	destroy: function() {
		this.parent();
		// We call an even regen on the player
		new ig.ACTION_STEP.REGEN_HP({
			value: 0.3, 
			target: ig.game.playerEntity, 
			hideNumbers: false
			}).start(ig.game.playerEntity.getCombatant())
		// We kill the entity if it has been destroyed by a hit
		this.kill(true);
	},
	unSetDropped: function() {
		this.dropped = false;
		this.setCurrentAnim("default", true);
		this.coll.type = ig.COLLTYPE.VIRTUAL;
		this.coll.setUpdateType(ig.COLL_UPDATE_TYPE.ON_SCREEN)
	},
});