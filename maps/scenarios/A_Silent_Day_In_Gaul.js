// Disables the territory decay (for all players)
TerritoryDecay.prototype.Decay = function() {};

/* TRIGGERPOINTS:
 * A: Spawn for Reinforcements after Red village Destroyed
 * B: Red Village
 * C: Bandit Spawnpoint
 * D: Bandit Camp
 * E: Outpost Build location
 * F: Bandit reinforcements
 */

// END OF TRIGGERPOINTS

// FUNCTIONS

/* Add a certain amount of a given resource to a given player
 * @param PlayerID: the ID of the player that receives the resources
 * @param resources: object that holds resource data: var resources = {"food" : 500};
 */
function AddPlayerResources(PlayerID, resources) {
	var cmpPlayer = TriggerHelper.GetPlayerComponent(PlayerID);
	
	for(var type in resources) {
		var resource = cmpPlayer.GetResourceCounts()[type];
		
		if ((resources[type] < 0) && (-resources[type] > resource))
			resources[type] = -resource;
		
		cmpPlayer.AddResource(type, resources[type]);
	}
}

/* Post a GUI notification
 * @param players: Array of playerIDs to post the message to
 * @param message: the to be posted message in a String
 */
function GUINotification(players, message) {
	var cmpGUIInterface = Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface);
	cmpGUIInterface.PushNotification({
		"players": players, 
		"message": message,
		translateMessage: true
	});
}

// END OF FUNCTIONS

// DEFEATCONDITIONS

/*
 * Check players the next turn. Avoids problems in Atlas, with promoting entities etc
 */
Trigger.prototype.CheckDefeatConditions = function()
{
	if (this.checkingConquestCriticalEntities)
		return;
	// wait a turn for actually checking the players
	this.DoAfterDelay(0, "DefeatConditionsPlayerOneAndThree", null);
	this.DoAfterDelay(0, "DefeatConditionsPlayerTwo", null);
	this.checkingConquestCriticalEntities = true;
};


// Modified version of the Conquest game type to allow for a cumstomized defeatcondition of Player 2 and some other niceties
Trigger.prototype.DefeatConditionsPlayerOneAndThree = function() {
	var cmpPlayerManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_PlayerManager);
	var PlayerIDs = [1, 3];

	for(var PlayerID of PlayerIDs) {
		// If the player is currently active but needs to be defeated,
		// mark that player as defeated
		var cmpPlayer = TriggerHelper.GetPlayerComponent(PlayerID);
		if (cmpPlayer.GetState() != "active") 
			continue;
		if (cmpPlayer.GetConquestCriticalEntitiesCount() == 0) {
			TriggerHelper.DefeatPlayer(PlayerID);
			// Push end game messages depending on the defeated player
			if (PlayerID == 1) {
				GUINotification([1], markForTranslation("Shame on you! Now the bandits can do whatever they like! Nothing can stop them now!"));
			} else if (PlayerID == 3) {
				GUINotification([1], markForTranslation("Well done! You've killed all the bandits!"));
				TriggerHelper.SetPlayerWon(1);
			}
		}
	}
	this.checkingConquestCriticalEntities = false;
};

Trigger.prototype.DefeatConditionsPlayerTwo = function() {
	var cmpPlayer = TriggerHelper.GetPlayerComponent(2);
	if (cmpPlayer.GetState() != "active") 
		return;	
	if (cmpPlayer.GetPopulationCount() == 0) {
		GUINotification([1], markForTranslation("Avenge us! Kill all the enemy bandits!"));
		TriggerHelper.DefeatPlayer(2);
	}
	this.checkingConquestCriticalEntities = false;
};

// END OF DEFEATCONDITIONS

// MISC

Trigger.prototype.PlayerCommandHandler = function(data) {
	// Check for the dialog response

	// DifficultyDialog
	if (this.DialogID == 1) {
		if (data.cmd.answer == "button1") {
			this.DifficultyMultiplier = 1; // Easy difficulty
			this.DialogID = 0; //reset the dialog var
		} else {
			this.DifficultyMultiplier = 1.3; // Intermediate difficulty
			this.DialogID = 0;  // reset the dialog var
		}

		// start the actual storyline by arming the first OnRange trigger and posting a message 
		var entities = cmpTrigger.GetTriggerPoints("B");
		data = {
			"entities": entities, // central points to calculate the range circles
			"players": [1], // only count entities of player 1
			"maxRange": 20,
			"requiredComponent": IID_UnitAI, // only count units in range
			"enabled": true,
		};
		cmpTrigger.RegisterTrigger("OnRange", "VisitVillage", data);
		this.DoAfterDelay(200, "IntroductionMessage", {});
	}

	// VisitVillageDialog
	if ( (this.DialogID == 2) && (data.cmd.answer == "button1" || "button2") ) {
		this.DoAfterDelay(1000, "VisitVillageMessage", {});
		this.DialogID = 0;
	}
};

// END OF MISC

// MESSAGES AND DIALOGUES

Trigger.prototype.DifficultyDialog = function() {
	this.DialogID = 1;
	var cmpGUIInterface = Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface);
	cmpGUIInterface.PushNotification({
		"type": "dialog",
		"players": [1,2,3,4,5,6,7,8],
		"dialogName": "yes-no",
		"data": {
			"text": {
				"caption": {
					"message": markForTranslation("This map supports 2 difficulties. Easy is recommended if you're a beginner, Intermediate if you have some experience in 0 A.D. already."),
					"translateMessage": true,
				},
			},
			"button1": {
				"caption": {
					"message": markForTranslation("Easy"),
					"translateMessage": true,
				},
				"tooltip": {
					"message": markForTranslation("Choose the Easy difficulty."),
					"translateMessage": true,
				},
			},
			"button2": {
				"caption": {
					"message": markForTranslation("Intermediate"),
					"translateMessage": true,
				},
				"tooltip": {
					"message": markForTranslation("Choose the Intermediate difficulty."),
					"translateMessage": true,
				},
			},
		},
	});
};

Trigger.prototype.IntroductionMessage = function() {
	GUINotification([1], markForTranslation("Visit the Elder in the Village to the East."));
};

Trigger.prototype.VisitVillageDialog = function() {
	this.DialogID = 2;
	var cmpGUIInterface = Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface);
	cmpGUIInterface.PushNotification({
		"type": "dialog",
		"players": [1,2,3,4,5,6,7,8],
		"dialogName": "yes-no",
		"data": {
			"text": {
				"caption": {
					"message": markForTranslation("Welcome, young man. I already heard of your arrival. What is it you are looking for?"),
					"translateMessage": true,
				},
			},
			"button1": {
				"caption": {
					"message": markForTranslation("I'm looking to increase my combat skills!"),
					"translateMessage": true,
				},
				"tooltip": {
					"message": markForTranslation("Say this"),
					"translateMessage": true,
				},
			},
			"button2": {
				"caption": {
					"message": markForTranslation("I'm looking to increase my wisdom!"),
					"translateMessage": true,
				},
				"tooltip": {
					"message": markForTranslation("Say this"),
					"translateMessage": true,
				},
			},
		},
	});
};

Trigger.prototype.VisitVillageMessage = function() {
	GUINotification([1], markForTranslation("Very good! I love that eagerness! I have a task for you: I need you to rebuild the old Outpost to the West of here. We need it to signal to other tribes. Good luck."));

	// Add resources required to build an Outpost
	var resources = {
		"wood": 80,
	};
	AddPlayerResources(1, resources);
};

Trigger.prototype.BuildOutpostMessage = function() {
	GUINotification([1], markForTranslation("This should be the place. Let's build that Outpost!"));
};

Trigger.prototype.BuildOutpostWrongTypeMessage = function() {
	GUINotification([1], markForTranslation("Elder: Aren't you even capable of building an Outpost!? Shame on you, go and return to your father!"));
};

Trigger.prototype.BuildOutpostWrongPlaceMessage = function() {
	GUINotification([1], markForTranslation("Elder: How can we use this Outpost if you didn't build it at the right place? Go and return to your father, I can't learn you anything!"));
};

Trigger.prototype.FlyAwayMessage = function() {
	GUINotification([1], markForTranslation("Elder: Bandits are attacking our village! Hurry Away to the West, the way you came from! You won't survive a minute!"));
};

Trigger.prototype.ReinforcementsMessage = function() {
	GUINotification([1], markForTranslation("Gaul Warrior: Let's teach those Bandits a lesson! Our scouts reported that there main camp is located to the south. Maybe we can find a path leading from the road to their camp. But let us build a Civil Center first!"));
};

Trigger.prototype.FanaticRaidMessage = function() {
	GUINotification([1], markForTranslation("Gaul Warrior: Beware! Enemies are upon us!"));
};

Trigger.prototype.DefeatPlayerOneMessage = function() {
	GUINotification([1], markForTranslation("Shame on you! Now the bandits can do whatever they like! Nothing can stop them now!"));
};

Trigger.prototype.DefeatPlayerTwoMessage = function() {
	GUINotification([1], markForTranslation("Avenge us! Kill all the enemy bandits!"));
};

Trigger.prototype.DefeatPlayerThreeMessage = function() {
	GUINotification([1], markForTranslation("Well done! You've killed all the bandits!"));
};

// END OF MESSAGES AND DIALOGUES

// STORYLINE (IN SEQUENCE)

/* This function fires a dialog as soon as the player comes in range of the Triggerpoint located in the Red Village. 
 * After this dialog, this trigger is disabled and the BuildOutpost trigger enabled.
 */
Trigger.prototype.VisitVillage = function(data) {
	// disable current trigger, execute commands and enable the next trigger(s)
	this.DisableTrigger("OnRange", "VisitVillage");
	
	// small delay for GUI notifications to prevent instant responses/reactions (technically not necessary but feels more natural)
	this.DoAfterDelay(200, "VisitVillageDialog", {});
	
	var entities = cmpTrigger.GetTriggerPoints("E");
	data = {
		"entities": entities, // central points to calculate the range circles
		"players": [1], // only count entities of player 1
		"maxRange": 40,
		"requiredComponent": IID_UnitAI, // only count units in range
		"enabled": true,
	};
	this.RegisterTrigger("OnRange", "BuildOutpost", data);

	this.RegisterTrigger("OnStructureBuilt", "SpawnAndAttackAlliedVillage", {"enabled" : true});
};

Trigger.prototype.BuildOutpost = function(data) {
/* disable current trigger, the next is already registered in the last trigger (VisitVillage) (as this trigger is only posting info and doesn't have an impact on the gameplay 
 * except informing the player of the build position)
 */
	this.DisableTrigger("OnRange", "BuildOutpost");

	this.DoAfterDelay(200, "BuildOutpostMessage", {});
};

Trigger.prototype.SpawnAndAttackAlliedVillage = function(data) {
	this.DisableTrigger("OnStructureBuilt", "SpawnAndAttackAlliedVillage");

	// check if the player has built the correct building and at the right place, player 1 loses if that isn't the case
	var entity1 = data["building"];
	var entity2 = this.GetTriggerPoints("E")[0];
	var distance = DistanceBetweenEntities(entity1, entity2);

	var cmpTemplateManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_TemplateManager);
	var template = cmpTemplateManager.GetCurrentTemplateName(entity1);

	if (template != "structures/gaul_outpost") {
		//disable defeat conditions
		this.DisableTrigger("OnOwnershipChanged", "CheckDefeatConditions");

		this.DoAfterDelay(0, "BuildOutpostWrongTypeMessage", {});
		TriggerHelper.DefeatPlayer(1);
		return;
	}

	if (distance > 30) {
		//disable defeat conditions
		this.DisableTrigger("OnOwnershipChanged", "CheckDefeatConditions");

		this.DoAfterDelay(0, "BuildOutpostWrongPlaceMessage", {});
		TriggerHelper.DefeatPlayer(1);
		return;
	}

	// spawn attackers
	var spawnPoint = "C";
	this.attackSize = 5;
	this.PlayerID = 3;

	var intruders = TriggerHelper.SpawnUnitsFromTriggerPoints(spawnPoint, "units/gaul_champion_fanatic", this.attackSize, this.PlayerID);

	for (var origin in intruders) {
		var cmd = null;

		for(var target of this.GetTriggerPoints("B")) {
			var cmpPosition = Engine.QueryInterface(target, IID_Position);
			if (!cmpPosition || !cmpPosition.IsInWorld)
				continue;
				// store the x and z coordinates in the command
			cmd = cmpPosition.GetPosition();
			break;
		}
		if (!cmd)
			continue;
		cmd.type = "attack-walk";
		cmd.entities = intruders[origin];
		cmd.queued = true;
		cmd.targetClasses = { "attack": ["Unit", "Structure"] };
		ProcessCommand(3, cmd);
	}

	this.DoAfterDelay(5000, "FlyAwayMessage", {});

	var entities = cmpTrigger.GetTriggerPoints("A");
	data = {
		"entities": entities, // central points to calculate the range circles
		"players": [1], // only count entities of player 1
		"maxRange": 40,
		"requiredComponent": IID_UnitAI, // only count units in range
		"enabled": true,
	};
	this.RegisterTrigger("OnRange", "FleeToTheEast", data);
};

Trigger.prototype.FleeToTheEast = function(data) {
	this.DisableTrigger("OnRange", "FleeToTheEast");
	this.PlayerID = 1;

	var cmpPlayerManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_PlayerManager);

	var PlayerEntityId = cmpPlayerManager.GetPlayerByID(this.PlayerID);
	var technames = ["phase_town_generic", "phase_city_gauls"];

	var cmpTechnologyManager = Engine.QueryInterface(PlayerEntityId, IID_TechnologyManager); 

	for(var i = 0; i < technames.length; i++) {
		// check if technology is already researched (accidentally)
		if (!cmpTechnologyManager.IsTechnologyResearched(technames[i])) {
			cmpTechnologyManager.ResearchTechnology(technames[i]); 
		}
	}

	//Add resources required to build a Civil Center
	var resources = {
		"wood": 500,
		"stone": 500,
		"metal": 500
	};
	AddPlayerResources(this.PlayerID, resources);

	// spawn reinforcements
	var spawnPoint = "A";
	this.attackSize = 5;
	this.PlayerID = 1;

	var reinforcements = TriggerHelper.SpawnUnitsFromTriggerPoints(spawnPoint, "units/gaul_champion_infantry", this.attackSize, this.PlayerID);

	this.DoAfterDelay(200, "ReinforcementsMessage", {});

	this.DoAfterDelay(60000, "FanaticRaid", {}); //Attack after 60 seconds
};

Trigger.prototype.FanaticRaid = function() {
	this.playerID = 3;
	var cmpRangeManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
	var entities = cmpRangeManager.GetEntitiesByPlayer(this.playerID);

	var cmpTemplateManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_TemplateManager);
	var units = [];
	
	for(var ent of entities) {
		var template = cmpTemplateManager.GetCurrentTemplateName(ent);
		if (template == "units/gaul_champion_fanatic")
			units.push(ent);
	}

	var cmd = null;

	for(var target of this.GetTriggerPoints("A")) 		{
		var cmpPosition = Engine.QueryInterface(target, IID_Position);
		if (!cmpPosition || !cmpPosition.IsInWorld)
			continue;
			// store the x and z coordinates in the command
		cmd = cmpPosition.GetPosition();
		break;
	}
	cmd.type = "attack-walk";
	cmd.entities = units;
	cmd.targetClasses = { "attack": ["Unit", "Structure"] };
	cmd.queued = true;
	ProcessCommand(3, cmd);

	this.DoAfterDelay(3000, "FanaticRaidMessage", {}); //3 seconds delay for the 'surprise-effect'
	

	data.delay = 300000; // after 5 minutes
	data.interval = 300000; // every 5 minutes

	cmpTrigger.RegisterTrigger("OnInterval", "BanditReinforcements", data);
};

Trigger.prototype.BanditReinforcements = function(data) {
	this.PlayerID = 3;

	this.attackSize = (Math.round(this.attackSize + this.attackSizeIncrement));
	this.attackSizeIncrement = (this.attackSizeIncrement * this.DifficultyMultiplier);

	var reinforcementPoint = "F";

	var reinforcements = TriggerHelper.SpawnUnitsFromTriggerPoints(reinforcementPoint, "units/gaul_champion_fanatic", this.attackSize, this.PlayerID);

	// Check if the Bandit base needs reinforcement and move to that instead. Else attack towards 'A' or the Civil Center if it exists
	for (var origin in reinforcements) {
		var cmd = null;

		var cmpPlayer = TriggerHelper.GetPlayerComponent(3);
		if (cmpPlayer.GetPopulationCount() < (5 + this.attackSize)) {
			for(var target of this.GetTriggerPoints("D")) {
				var cmpPosition = Engine.QueryInterface(target, IID_Position);
				if (!cmpPosition || !cmpPosition.IsInWorld)
					continue;
					// store the x and z coordinates in the command
				cmd = cmpPosition.GetPosition();
				break;
			}
			cmd.type = "walk";
			cmd.entities = reinforcements[origin];
			cmd.queued = true;
			ProcessCommand(3, cmd);
			break;
		}

		for(var target of this.GetTriggerPoints("A")) {
			var cmpPosition = Engine.QueryInterface(target, IID_Position);
			if (!cmpPosition || !cmpPosition.IsInWorld)
				continue;
				// store the x and z coordinates in the command
			cmd = cmpPosition.GetPosition();
			break;
		}

		var cmpRangeManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
		var entities = cmpRangeManager.GetEntitiesByPlayer(1);

		var cmpTemplateManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_TemplateManager);
		var structures = [];

		for(var entity of entities) {

			var template = cmpTemplateManager.GetCurrentTemplateName(entity);
			if (template == "structures/gaul_civil_centre") {
				structures.push(entity);

				var cmpPosition = Engine.QueryInterface(entity, IID_Position);
				if (!cmpPosition || !cmpPosition.IsInWorld)
				continue;
				// store the x and z coordinates in the command
				cmd = cmpPosition.GetPosition();
			}
		}

		if(!cmd)
			return;
	}

	cmd.type = "attack-walk";
	cmd.entities = reinforcements[origin];
	cmd.targetClasses = { "attack": ["Unit", "Structure"] };
	cmd.queued = true;
	ProcessCommand(3, cmd);
};

// END OF STORYLINE

var cmpTrigger = Engine.QueryInterface(SYSTEM_ENTITY, IID_Trigger);
var data = {"enabled": true};

// Vars for data storage
cmpTrigger.DifficultyMultiplier = 0.5; // 0.5 is easy, 0.7 is intermediate
cmpTrigger.DialogID = 0; // var to keep track of the dialogs
cmpTrigger.attackSize = 5; // initial amount for Bandit reinforcements
cmpTrigger.attackSizeIncrement = 5; // amount to add to the attackSize each raid


// Arm a number of triggers that are required to run along side the storyline
cmpTrigger.RegisterTrigger("OnOwnershipChanged", "CheckDefeatConditions", data);
cmpTrigger.RegisterTrigger("OnPlayerCommand", "PlayerCommandHandler", data);

// Start storyline by posting the first dialog 
cmpTrigger.DoAfterDelay(0, "DifficultyDialog", {});

