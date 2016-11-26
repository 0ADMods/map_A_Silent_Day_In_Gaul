// disables the territory decay (for all players)
TerritoryDecay.prototype.UpdateDecayState = function() {};
var conquestClassFilter = "ConquestCritical";

/* Triggerpoints
 * A: Spawn for Reinforcements after Red village Destroyed
 * B: Red Village
 * C: Bandit Spawnpoint
 * D: Bandit Camp
 * E: Outpost Build location
 * F: Bandit reinforcements
 */

// FUNCTIONS

/* Queries a Player Component from a given player
 * @param PlayerID: the ID of the player
 */

function GetPlayerComponent(playerID) 
{ 
    let cmpPlayerMan = Engine.QueryInterface(SYSTEM_ENTITY, IID_PlayerManager); 
    return Engine.QueryInterface(cmpPlayerMan.GetPlayerByID(playerID), IID_Player); 
};

/* Add a certain amount of a given resource to a given player. The difference wit cmpPlayer.AddResources() is that it prevents resource amounts to be negative.
 * @param PlayerID: the ID of the player that receives the resources
 * @param resources: object that holds resource data. example: var resources = {"food" : 500};
 */

function AddPlayerResources(PlayerID, resources) 
{
	var cmpPlayer = GetPlayerComponent(PlayerID);
	for(var type in resources) {
			if ((resources[type] < 0) && (-resources[type] > cmpPlayer.GetResourceCounts()[type]))
				resources[type] = -cmpPlayer.GetResourceCounts()[type];
	}
	cmpPlayer.AddResources(resources);
}

/* Post a GUI notification
 * @param players: Array of playerIDs to post the message to
 * @param message: the to be posted message in a string
 */
function GUINotification(players, message) 
{
	Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface).PushNotification({
		"players": players, 
		"message": message,
		translateMessage: true
	});
}

/* Remove current GUINotification(s)
 * Doesn't need any parameters.
 */
function ClearGUINotifications() 
{
	var cmpGUIInterface = Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface);

	for (var i in cmpGUIInterface.timeNotifications)
		cmpGUIInterface.timeNotifications.splice(i);
}

/* Post a chat message
 * @param sender: PlayerID of the player that sends the message
 * @param recipient: Array of PlayerIDs that will see the message
 * @param message: the to be posted message in a string
 */
function ChatNotification(sender, recipient, message) 
{
	ProcessCommand(sender, {"type" : "chat", "players" : recipient, "message" : message});
}

// END OF FUNCTIONS

// DEFEATCONDITIONS

Trigger.prototype.HandlerOwnerShipChanged = function(msg)
{
	warn(uneval(msg));

	if (!this.conquestDataInit || !this.conquestClassFilter)
		return;

	if (!TriggerHelper.EntityHasClass(msg.entity, this.conquestClassFilter))
		return;



	if (msg.to > 0 && this.conquestEntitiesByPlayer[msg.to])
		this.conquestEntitiesByPlayer[msg.to].push(msg.entity);

	if (msg.from == -1)
		return;

	let entities = this.conquestEntitiesByPlayer[msg.from];
	let index = entities.indexOf(msg.entity);

	// Check the victory conditions
	
	// player 1 
	if(msg.from == 1) 
	{
		if (index >= 0)
		{
			entities.splice(index, 1);
			if (!entities.length)
			{
			
				TriggerHelper.DefeatPlayer(1);
				this.DefeatPlayerOneMessage();
			}
		}
	} 
	else if (msg.from == 2) 
	{
		warn("We check player 2");
		var cmpRangeManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
		var entity = cmpRangeManager.GetEntitiesByPlayer(msg.from);
		warn(uneval(entities));

		var cmpTemplateManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_TemplateManager);
		var units = [];

		// search for all healer units and break if one is found
		for(var ent of entity) 
		{
			var template = cmpTemplateManager.GetCurrentTemplateName(ent);
			if (template == "units/gaul_support_healer_b")
				return;
		}

		TriggerHelper.DefeatPlayer(msg.from);
		this.DefeatPlayerTwoMessage();
	} 
	else // msg.from == 3
	{
		if (index >= 0)
		{
			entities.splice(index, 1);
			if (!entities.length)
			{
				this.DefeatPlayerThreeMessage();
				this.DisableTrigger("OnInterval", "ObjectiveKillBandits");
				TriggerHelper.SetPlayerWon(1);
				TriggerHelper.DefeatPlayer(msg.from);
			}
		}
	}
};

/*

Trigger.prototype.DefeatConditionsPlayerOne = function(data) 
{
	var cmpPlayer = GetPlayerComponent(1);
	if (!cmpPlayer || cmpPlayer.GetState() != "active")
		return;	
	
	if (cmpPlayer.GetConquestCriticalEntitiesCount() != 0)
		return; 

	this.DisableTrigger("OnOwnershipChanged", "DefeatConditionsPlayerOne");
	this.DefeatPlayerOneMessage();
	TriggerHelper.DefeatPlayer(1);
};

Trigger.prototype.DefeatConditionsPlayerTwo = function(data) 
{
	this.playerID = 2;
	var cmpRangeManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
	var entities = cmpRangeManager.GetEntitiesByPlayer(this.playerID);

	var cmpTemplateManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_TemplateManager);
	var units = [];

	// search for all healer units and break if one is found
	for(var ent of entities) 
	{
		var template = cmpTemplateManager.GetCurrentTemplateName(ent);
		if (template == "units/gaul_support_healer_b")
			return;
	}

	this.DisableTrigger("OnOwnershipChanged", "DefeatConditionsPlayerTwo");
	this.DefeatPlayerTwoMessage();
	TriggerHelper.DefeatPlayer(2);
};

Trigger.prototype.DefeatConditionsPlayerThree = function(data) 
{
	var cmpPlayer = GetPlayerComponent(3);
	if (!cmpPlayer || cmpPlayer.GetState() != "active")
		return;	

	if (cmpPlayer.GetConquestCriticalEntitiesCount() != 0) 
		return;

	this.DisableTrigger("OnOwnershipChanged", "DefeatConditionsPlayerThree");
	this.DefeatPlayerThreeMessage();
	this.DisableTrigger("OnInterval", "ObjectiveKillBandits");
	TriggerHelper.SetPlayerWon(1);
	TriggerHelper.DefeatPlayer(3);
};*/

// END OF DEFEATCONDITIONS

// MISC

Trigger.prototype.PlayerCommandHandler = function(data) 
{
	// check for dialog responses
	switch(this.DialogID)
	{
	case "DifficultyDialog":
		data.cmd.answer == "button1" ? this.DifficultyMultiplier = this.DifficultyMultiplierEasy : this.DifficultyMultiplier = this.DifficultyMultiplierIntermediate;
		this.DialogID = "NoDialog"; // reset the dialog var

		// start the actual storyline by arming the first OnRange trigger and posting a message 
		var entities = cmpTrigger.GetTriggerPoints("B");
		cmpTrigger.RegisterTrigger("OnRange", "VisitVillage", {
			"entities": entities, // central points to calculate the range circles
			"players": [1], // only count entities of player 1
			"maxRange": 20,
			"requiredComponent": IID_UnitAI, // only count units in range
			"enabled": true
		});
		// Enable first objective message
		this.RegisterTrigger("OnInterval", "ObjectiveVisitVillage", {
			"enabled": true,
			"delay": 1000, // after 1 seconds
			"interval": this.messageTimeout
		});
		break;
	case "VisitVillageDialog":
		this.DoAfterDelay(1000, "VisitVillageMessage", {});
		this.DialogID = "NoDialog";
		break;
	}
};

// make sure player 1 and 4 have the correct diplomacy status at the start of the game
Trigger.prototype.InitDiplomacies = function() 
{
	var cmpPlayer = GetPlayerComponent(1);
	cmpPlayer.SetNeutral(4);

	cmpPlayer = GetPlayerComponent(4);
	cmpPlayer.SetNeutral(1);
	cmpPlayer.SetAlly(3);

	cmpPlayer = GetPlayerComponent(3);
	cmpPlayer.SetAlly(4);
};

Trigger.prototype.FarmerGather = function() 
{
	this.DisableTrigger("OnRange", "FarmerGather");
	this.DoAfterDelay(200, "FarmerMessage", {});

	// set diplomacies
	ProcessCommand(4, {
		"type": "diplomacy", 
		"to": "ally", 
		"player": 1
	});

	var cmpPlayer = GetPlayerComponent(1);
	cmpPlayer.SetAlly(4);

	// find the gatherer and the field IDs and task the gatherer to the field
	this.playerID = 4;
	var cmpRangeManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
	var entities = cmpRangeManager.GetEntitiesByPlayer(this.playerID);

	var gatherers = [];
	var resource = [];

	for(var entity of entities) 
	{
		if (TriggerHelper.EntityHasClass(entity, "Unit")) 
			gatherers.push(entity);
		if (TriggerHelper.EntityHasClass(entity, "Field")) 
			resource.push(entity);
	}

	ProcessCommand(4, {
		"type": "gather", 
		"entities": gatherers, 
		"target": resource[0], 
		"queued": true
	});

	this.RegisterTrigger("OnInterval", "FarmerTribute", { 
		"enabled": true, 
		"delay": 10000, // after 10 seconds
		"interval": 30000 // every 30 seconds
	});
};

Trigger.prototype.FarmerTribute = function() 
{
	// every 30 seconds the Farmer tributes all his food as long as he has more than 50
	this.PlayerID = 4;
	var cmpPlayer = GetPlayerComponent(this.PlayerID);

	var resource = {"food" : cmpPlayer.GetResourceCounts()["food"]};
	if (resource["food"] < 50)
		return;

	ProcessCommand(4, {
		"type": "tribute", 
		"player": 1, 
		"amounts": resource
	});
};

Trigger.prototype.TreasureFound = function() 
{
	this.DisableTrigger("OnRange", "TreasureFound");
	this.DoAfterDelay(200, "TreasureFoundMessage", {});
};

// END OF MISC

// MESSAGES AND DIALOGUES

Trigger.prototype.DifficultyDialog = function() 
{
	this.DialogID = "DifficultyDialog";
	var cmpGUIInterface = Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface);
	cmpGUIInterface.PushNotification({
		"type": "dialog",
		"players": [1],
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

Trigger.prototype.VisitVillageDialog = function() 
{
	this.DialogID = "VisitVillageDialog";
	var cmpGUIInterface = Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface);
	cmpGUIInterface.PushNotification({
		"type": "dialog",
		"players": [1],
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

Trigger.prototype.VisitVillageMessage = function()
 {
	ChatNotification(2, [1], markForTranslation("Elder: Very good! I love that eagerness! I have a task for you: I need you to rebuild the old Outpost to the West of here. We need it to signal to other tribes. Good luck."));
	
	// add resources required to build an Outpost
	AddPlayerResources(1, { "wood": 80 });
};

Trigger.prototype.BuildOutpostMessage = function() 
{
	ChatNotification(1, [1], markForTranslation("This should be the place. Let's build that outpost!"));
};

Trigger.prototype.BuildOutpostWrongTypeMessage = function() 
{
	ChatNotification(2, [1], markForTranslation("Elder: Aren't you even capable of building an outpost!? Shame on you, go and return to your father!"));
};

Trigger.prototype.BuildOutpostWrongPlaceMessage = function() 
{
	ChatNotification(2, [1], markForTranslation("Elder: How can we use this outpost if you didn't build it at the right place? Go and return to your father, I can't teach you anything!"));
};

Trigger.prototype.FlyAwayMessage = function() 
{
	ChatNotification(2, [1], markForTranslation("Elder: Bandits are attacking our village! Follow the road back to the West, the way you came from! You won't survive a minute!"));
};

Trigger.prototype.ReinforcementsMessage = function() 
{
	ChatNotification(1, [1], markForTranslation("Gaul Warrior: Let's teach those bandits a lesson! Our scouts reported that there main camp is located to the south. Maybe we can find a path leading from the road to their camp. But let us build a Civil Center first! Beware though, there are other bandit groups roaming around in these lands!"));
};

Trigger.prototype.FanaticRaidMessage = function() 
{
	ChatNotification(1, [1], markForTranslation("Gaul Warrior: Beware! Enemies are upon us!"));
};

Trigger.prototype.FarmerMessage = function() 
{
	ChatNotification(4, [1], markForTranslation("You're not one of those bandits, eh? They took my wife and children and ruined my life. I'll help you by giving you the harvest of my farm."));
};

Trigger.prototype.TreasureFoundMessage = function() 
{
	ChatNotification(1, [1], markForTranslation("Hmm, it seems that someone left a good amount of metal here. Let's put it to a good use!"));
};

Trigger.prototype.DefeatPlayerOneMessage = function() 
{
	GUINotification([1], markForTranslation("Shame on you! Now the bandits can do whatever they like! Nothing can stop them now!"));
};

Trigger.prototype.DefeatPlayerTwoMessage = function() 
{
	ChatNotification(2, [1], markForTranslation("We have been slain! Avenge us!"));
};

Trigger.prototype.DefeatPlayerThreeMessage = function() 
{
	GUINotification([1], markForTranslation("Well done! You've killed all the bandits!"));
};

// Objective messages
Trigger.prototype.ObjectiveVisitVillage = function() 
{
	GUINotification([1], markForTranslation("Visit the Elder in the Village to the East."));
};

Trigger.prototype.ObjectiveBuildOutpost = function() 
{
	GUINotification([1], markForTranslation("Build an Outpost on the hill to the west."));
};

Trigger.prototype.ObjectiveFleeToWest = function() 
{
	GUINotification([1], markForTranslation("Follow the road to the West."));
};

Trigger.prototype.ObjectiveKillBandits = function() 
{
	GUINotification([1], markForTranslation("Build a Civil Center, kill all Bandits and destroy their base."));
};

// End of Objective messages

// END OF MESSAGES AND DIALOGUES

// STORYLINE (IN SEQUENCE)

/* This function fires a dialog as soon as the player comes in range of the Triggerpoint located in the Red Village
 * After this dialog, this trigger is disabled and the BuildOutpost trigger enabled
 */
Trigger.prototype.VisitVillage = function() 
{
	// disable current trigger(s), execute commands and enable the next trigger(s)
	this.DisableTrigger("OnRange", "VisitVillage");
	this.DisableTrigger("OnInterval", "ObjectiveVisitVillage");

	// small delay for GUI notifications to prevent instant responses/reactions (technically not necessary but feels more natural)
	this.DoAfterDelay(200, "VisitVillageDialog", {});
	
	var entities = cmpTrigger.GetTriggerPoints("E");
	this.RegisterTrigger("OnRange", "BuildOutpost", {
		"entities": entities, // central points to calculate the range circles
		"players": [1], // only count entities of player 1
		"maxRange": 40,
		"requiredComponent": IID_UnitAI, // only count units in range
		"enabled": true,
	});

	// enable objective message
	this.RegisterTrigger("OnInterval", "ObjectiveBuildOutpost", {
		"enabled": true,
		"delay": 1000, // after 1 second
		"interval": this.messageTimeout
	});

	this.RegisterTrigger("OnStructureBuilt", "SpawnAndAttackAlliedVillage", {"enabled" : true});
};

Trigger.prototype.BuildOutpost = function(data) 
{
/* disable current trigger, the next is already registered in the last trigger (VisitVillage) 
 * (as this trigger is only posting info and doesn't have an impact on the gameplay 
 * except informing the player of the build position)
 */
	this.DisableTrigger("OnRange", "BuildOutpost");

	this.DoAfterDelay(200, "BuildOutpostMessage", {});
};

Trigger.prototype.SpawnAndAttackAlliedVillage = function(data) {
	this.DisableTrigger("OnStructureBuilt", "SpawnAndAttackAlliedVillage");
	this.DisableTrigger("OnInterval", "ObjectiveBuildOutpost");

	// check if the player has built the correct building and at the right place, player 1 loses if that isn't the case
	var building = data["building"];
	var triggerpoint = this.GetTriggerPoints("E")[0];
	var distance = DistanceBetweenEntities(building, triggerpoint);

	var cmpTemplateManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_TemplateManager);
	var template = cmpTemplateManager.GetCurrentTemplateName(building);

	if (template != "structures/gaul_outpost") 
	{
		this.BuildOutpostWrongTypeMessage();
		// disable defeat conditions
		this.DisableTrigger("OnOwnershipChanged", "DefeatConditionsPlayerOne");
		this.DisableTrigger("OnOwnershipChanged", "DefeatConditionsPlayerTwo");
		this.DisableTrigger("OnOwnershipChanged", "DefeatConditionsPlayerThree");
		
		TriggerHelper.DefeatPlayer(1);
		return;
	}

	if (distance > 30) 
	{
		this.BuildOutpostWrongPlaceMessage();
		// disable defeat conditions
		this.DisableTrigger("OnOwnershipChanged", "DefeatConditionsPlayerOne");
		this.DisableTrigger("OnOwnershipChanged", "DefeatConditionsPlayerTwo");
		this.DisableTrigger("OnOwnershipChanged", "DefeatConditionsPlayerThree");

		TriggerHelper.DefeatPlayer(1);
		return;
	}

	// spawn attackers
	var spawnPoint = "C";
	this.attackNum = 5;
	this.PlayerID = 3;
	var intruders = TriggerHelper.SpawnUnitsFromTriggerPoints(spawnPoint, "units/gaul_champion_fanatic", this.attackNum, this.PlayerID);

	for (var origin in intruders) 
	{
		var cmd = null;

		for(var target of this.GetTriggerPoints("B")) 
		{
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
		cmd.targetClasses = { "attack": ["Unit"] };
		ProcessCommand(3, cmd);
	}
	
	var entities = cmpTrigger.GetTriggerPoints("A");
	this.RegisterTrigger("OnRange", "FleeToTheWest", {
		"entities": entities, // central points to calculate the range circles
		"players": [1], // only count entities of player 1
		"maxRange": 40,
		"requiredComponent": IID_UnitAI, // only count units in range
		"enabled": true,
	});

	this.DoAfterDelay(5000, "FlyAwayMessage", {});

	// enable objective message
	ClearGUINotifications();
	this.RegisterTrigger("OnInterval", "ObjectiveFleeToWest", {
		"enabled": true,
		"delay": 5000, // after 5 seconds
		"interval": this.messageTimeout
	});
};

Trigger.prototype.FleeToTheWest = function(data) 
{
	this.DisableTrigger("OnRange", "FleeToTheWest");
	this.DisableTrigger("OnInterval", "ObjectiveFleeToWest");

	this.PlayerID = 1;
	var cmpTechnologyManager = QueryPlayerIDInterface(this.PlayerID, IID_TechnologyManager);
	var technames = ["phase_town_generic", "phase_city_gauls"];

	for(var i = 0; i < technames.length; ++i) 
	{
		// check if technology is already researched (accidentally)
		if (!cmpTechnologyManager.IsTechnologyResearched(technames[i]))
			cmpTechnologyManager.ResearchTechnology(technames[i]); 
	}

	// add resources required to build a Civil Center
	AddPlayerResources(this.PlayerID, {
		"food": 250,
		"wood": 700,
		"stone": 700,
		"metal": 500
	});

	// spawn reinforcements
	var spawnPoint = "A";
	this.reinforcementSize = 5;
	this.PlayerID = 1;
	TriggerHelper.SpawnUnitsFromTriggerPoints(spawnPoint, "units/gaul_champion_infantry", this.reinforcementSize, this.PlayerID);
	TriggerHelper.SpawnUnitsFromTriggerPoints(spawnPoint, "units/gaul_support_female_citizen", this.reinforcementSize, this.PlayerID);

	this.DoAfterDelay(200, "ReinforcementsMessage", {});

	// enable objective message
	ClearGUINotifications();
	this.RegisterTrigger("OnInterval", "ObjectiveKillBandits", { 
		"enabled": true,
		"delay": 1000, // after 1 second
		"interval": this.messageTimeout
	});

	this.DoAfterDelay(100000, "FanaticRaid", {}); // attack after 100 seconds
};

Trigger.prototype.FanaticRaid = function() 
{
	this.playerID = 3;
	var cmpRangeManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
	var entities = cmpRangeManager.GetEntitiesByPlayer(this.playerID);

	var cmpTemplateManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_TemplateManager);
	var units = [];
	var cmd = null;

	// search for all fanatic units and put the IDs in an array
	for(var ent of entities) 
	{
		var template = cmpTemplateManager.GetCurrentTemplateName(ent);
		if (template == "units/gaul_champion_fanatic")
			units.push(ent);
	}

	for(var target of this.GetTriggerPoints("A")) 		
	{
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

	this.DoAfterDelay(5000, "FanaticRaidMessage", {}); // 5 seconds delay for the 'surprise-effect'
	
	cmpTrigger.RegisterTrigger("OnInterval", "BanditReinforcements", {
		"delay": 450000,
		"interval": Math.round(250000/this.DifficultyMultiplier) // every 8.3 minutes for easy and every 6 minutes for intermediate
	});
};

// check if the Bandit base needs reinforcement and issue a reinforcement army (so that the bandit army in the bandit base = Player1PopCount/2*DifficultyMultiplier)
	// after that spawn an army that attacks towards 'A' or, if it exists, the Civil Center built by the Human player
function SpawnBaseReinforcements(reinforcementPoint) 
{
	var cmpPlayer = GetPlayerComponent(3);
	var cmpPlayer1 = GetPlayerComponent(1);
	if ( (cmpPlayer1.GetPopulationCount()/2)*this.DifficultyMultiplier > cmpPlayer.GetPopulationCount()) 
	{
		var reinforcements = TriggerHelper.SpawnUnitsFromTriggerPoints(reinforcementPoint, "units/gaul_champion_fanatic", 
			( cmpPlayer1.GetPopulationCount()/2*this.DifficultyMultiplier - cmpPlayer.GetPopulationCount() ), this.PlayerID);

		for (var origin in reinforcements) 
		{
			var cmd = null;

			for(var target of this.GetTriggerPoints("D")) 
			{
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
		}
	}
}

function SpawnAndAttack(reinforcementPoint)
{
	var cmd = null;
	var reinforcements = TriggerHelper.SpawnUnitsFromTriggerPoints(reinforcementPoint, "units/gaul_champion_fanatic", this.attackSize, this.PlayerID);

	for (var origin in reinforcements) 
	{
		for(var target of this.GetTriggerPoints("A")) 
		{
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

		for(var entity of entities) 
		{
			var template = cmpTemplateManager.GetCurrentTemplateName(entity);
			if (template == "structures/gaul_civil_centre") 
			{
				structures.push(entity);

				var cmpPosition = Engine.QueryInterface(entity, IID_Position);
				if (!cmpPosition || !cmpPosition.IsInWorld)
				continue;
				// store the x and z coordinates in the command
				cmd = cmpPosition.GetPosition();
			}
		}
	}

	if(!cmd)
		return;
	
	cmd.type = "attack-walk";
	cmd.entities = reinforcements[origin];
	cmd.targetClasses = { "attack": ["Unit", "Structure"] };
	cmd.queued = true;
	ProcessCommand(3, cmd);
}

Trigger.prototype.BanditReinforcements = function(data) 
{
	this.PlayerID = 3;
	var reinforcementPoint = "F";
	this.attackSize = Math.round(this.attackSize + this.attackSizeIncrement);
	this.attackSizeIncrement = (this.attackSizeIncrement * this.DifficultyMultiplier);

	SpawnBaseReinforcements(reinforcementPoint);

	SpawnAndAttack(reinforcementPoint);

	this.DoAfterDelay(0, "FanaticRaidMessage");
};

// END OF STORYLINE



var cmpTrigger = Engine.QueryInterface(SYSTEM_ENTITY, IID_Trigger);

// vars for data storage
cmpTrigger.DifficultyMultiplierEasy = 1.0; // 1.0 is easy, 1.3 is intermediate
cmpTrigger.DifficultyMultiplierIntermediate = 1.3;
cmpTrigger.DialogID = "NoDialog"; // var to keep track of the dialogs
cmpTrigger.attackSize = 4; // initial amount for Bandit reinforcements
cmpTrigger.attackSizeIncrement = 2; // amount to add to the attackSize each raid
cmpTrigger.messageTimeout = 20000;

// vars for victory conditions
cmpTrigger.conquestEntitiesByPlayer = {};
cmpTrigger.conquestDataInit = false;
cmpTrigger.conquestClassFilter = "ConquestCritical";
cmpTrigger.DoAfterDelay(0, "ConquestStartGameCount", null);

//cmpTrigger.RegisterTrigger("OnStructureBuilt", "ConquestAddStructure", {"enabled": true});
//cmpTrigger.RegisterTrigger("OnTrainingFinished", "ConquestTrainingFinished", {"enabled": true});

// arm a number of triggers that are required to run along side the storyline
cmpTrigger.RegisterTrigger("OnOwnershipChanged", "HandlerOwnerShipChanged", {"enabled": true});
//cmpTrigger.RegisterTrigger("OnOwnershipChanged", "DefeatConditionsPlayerOne", {"enabled": true});
//cmpTrigger.RegisterTrigger("OnOwnershipChanged", "DefeatConditionsPlayerTwo", {"enabled": true});
//cmpTrigger.RegisterTrigger("OnOwnershipChanged", "DefeatConditionsPlayerThree", {"enabled": true});
cmpTrigger.RegisterTrigger("OnPlayerCommand", "PlayerCommandHandler", {"enabled": true});
cmpTrigger.DoAfterDelay(0, "InitDiplomacies", {});

var entities = cmpTrigger.GetTriggerPoints("G");
cmpTrigger.RegisterTrigger("OnRange", "FarmerGather", {
	"entities": entities, // central points to calculate the range circles
	"players": [1], // only count entities of player 1
	"maxRange": 40,
	"requiredComponent": IID_UnitAI, // only count units in range
	"enabled": true,
});

var entities = cmpTrigger.GetTriggerPoints("H");
cmpTrigger.RegisterTrigger("OnRange", "TreasureFound", {
	"entities": entities, // central points to calculate the range circles
	"players": [1], // only count entities of player 1
	"maxRange": 30,
	"requiredComponent": IID_UnitAI, // only count units in range
	"enabled": true,
});

// start storyline by posting the first dialog 
cmpTrigger.DoAfterDelay(200, "DifficultyDialog", {});