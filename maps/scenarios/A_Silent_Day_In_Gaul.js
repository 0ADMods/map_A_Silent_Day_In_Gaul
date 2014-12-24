warn("loading the triggers file");

//Debug listeners
Trigger.prototype.OwnershipChangedAction = function(data)
{
	warn("The OnOwnershipChanged event happened with the following data:");
	warn(uneval(data));
};

Trigger.prototype.PlayerCommandAction = function(data)
{
	warn("The OnPlayerCommand event happened with the following data:");
	warn(uneval(data));
};

//Disables the territory decay (for all players)
TerritoryDecay.prototype.Decay = function() {
	var cmpHealth = Engine.QueryInterface(this.entity, IID_Health);
	if (!cmpHealth)
		return;

	var decayRate = 0;

	cmpHealth.Reduce(Math.round(decayRate));
};

//TRIGGERPOINTS:
/*
A: Spawn for Reinforcements after Red village Destroyed.
B: Red Village.
C: Bandit Spawnpoint.
D: Bandit Camp.
E: Outpost Build location
*/

//END OF TRIGGERPOINTS

//FUNCTIONS

//Add a certain amount of a given resource to a given player
//@param PlayerID: the ID of the player that receives the resources
//@param resources: object that holds resource data: var resources = {"food" : 500};
function AddPlayerResources(PlayerID, resources) {
	var Player = TriggerHelper.GetPlayerComponent(PlayerID);
	
	for(var type in resources) {
		var resource = Player.GetResourceCounts()[type];
		
		if ((resources[type] < 0) && (-resources[type] > resource))
			resources[type] = -resource;
		
		Player.AddResource(type, resources[type]);
	}
}

//Post a GUI notification
//@param players: Array of playerIDs to post the message to
//@param message: the to be posted message in a String
function GUINotification(players, message) {
	var cmpGUIInterface = Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface);
	cmpGUIInterface.PushNotification({
		"players": players, 
		"message": message,
		translateMessage: true
	});
}

//END OF FUNCTIONS

//DEFEATCONDITIONS

//Check for populations and mark the corresponding player as defeated if it is zero
Trigger.prototype.DefeatConditionsPlayerOne = function(data) {
	var P = TriggerHelper.GetPlayerComponent(1);
	if (P.GetPopulationCount() == 0) {
		this.DisableTrigger("OnOwnershipChanged", "DefeatConditionsPlayerOne");
		PushGUINotification([1], markForTranslation("Shame on you! You've been killed!"));
		TriggerHelper.DefeatPlayer(1);
	}
};

Trigger.prototype.DefeatConditionsPlayerTwo = function(data) {
	var P = TriggerHelper.GetPlayerComponent(2);
	if (P.GetPopulationCount() == 0) {
		this.DisableTrigger("OnOwnershipChanged", "DefeatConditionsPlayerTwo");
		PushGUINotification([1], markForTranslation("Avenge us! Kill all the enemy bandits!"));
		TriggerHelper.DefeatPlayer(2);
	}
};

Trigger.prototype.DefeatConditionsPlayerThree = function(data) {
	var P = TriggerHelper.GetPlayerComponent(3);
	if (P.GetPopulationCount() == 0) {
		this.DisableTrigger("OnOwnershipChanged", "DefeatConditionsPlayerThree");
		PushGUINotification([1], markForTranslation("Well done! You've killed all the bandits!"));
		TriggerHelper.DefeatPlayer(3);
		TriggerHelper.SetPlayerWon(1);
	}
};

//END OF DEFEATCONDITIONS

//PLAYER COMMAND LISTENER

Trigger.prototype.PlayerCommandHandler = function(data) {
	if ((data.cmd.type == "dialog-answer") && (data.cmd.answer == "button1" || "button2"))
		this.DoAfterDelay(1000, "VisitVillageMessage", {});
};

//END OF PLAYER COMMAND LISTENER

//MESSAGES AND DIALOGUES

Trigger.prototype.IntroductionMessage = function() {
    PushGUINotification([1], markForTranslation("Visit the Elder in the Village to the East."));
};

Trigger.prototype.VisitVillageDialog = function() {
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
    PushGUINotification([1], markForTranslation("Very good! I love that eagerness! I have a task for you: I need you to rebuild the old Outpost to the Northwest of here. Good luck."));

	//Add resources required to build an Outpost
	AddPlayerResources(1, "wood", 80);
};

Trigger.prototype.BuildOutpostMessage = function() {
    PushGUINotification([1], markForTranslation("This should be the place. Let's build that Outpost!"));
};

Trigger.prototype.FlyAwayMessage = function() {
    PushGUINotification([1], markForTranslation("Elder: Bandits are attacking our village! Hurry Away to the East, the way you came from! You wouldn't survive a minute"));
};

Trigger.prototype.ReinforcementsMessage = function() {
    PushGUINotification([1], markForTranslation("Gaul Warrior: Let's teach those Bandits a lesson! Our scouts reported that there main camp is located to the south. Maybe we can find a path leading from the road to their camp. Also we shouldn't forget to kill the attackers that should be somewhere nearby the village."));
};

//END OF MESSAGES AND DIALOGUES

//STORYLINE (IN SEQUENCE)

//This function fires a dialog as soon as the player comes in range of the Triggerpoint located in the Red Village. After this dialog, this trigger is disabled and the BuildOutpost trigger enabled.
Trigger.prototype.VisitVillage = function(data) {
	this.DoAfterDelay(200, "VisitVillageDialog", {});

	//enable next trigger and disable current
	var entities = cmpTrigger.GetTriggerPoints("E");
	data = {
		"entities": entities, // central points to calculate the range circles
		"players": [1], // only count entities of player 1
		"maxRange": 40,
		"requiredComponent": IID_UnitAI, // only count units in range
		"enabled": true,
	};
	cmpTrigger.RegisterTrigger("OnRange", "BuildOutpost", data);
	this.RegisterTrigger("OnStructureBuilt", "SpawnAndAttackAlliedVillage", {"enabled" : true});
	this.DisableTrigger("OnRange", "VisitVillage");
};

Trigger.prototype.BuildOutpost = function(data) {
	this.DoAfterDelay(200, "BuildOutpostMessage", {});

	//disable current trigger, the next is already registered in VisitVillage (as this trigger is only posting info and doesn't have an impact on the gameplay 
		// exept informing the player of the build position)
	this.DisableTrigger("OnRange", "BuildOutpost");
};

Trigger.prototype.SpawnAndAttackAlliedVillage = function(data) {
	this.DisableTrigger("OnStructureBuilt", "SpawnAndAttackAlliedVillage");

	//check if the player has built the correct building and at the right place
	var cmpTemplateManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_TemplateManager);
	var template = cmpTemplateManager.GetCurrentTemplateName(data["building"]);

	var entity1 = data["building"];
	var entity2 = this.GetTriggerPoints("E")[0];
	var distance = DistanceBetweenEntities(entity1, entity2);

	if (template != "structures/gaul_outpost") {
		//disable all defeat conditions
		this.DisableTrigger("OnOwnershipChanged", "DefeatConditionsPlayerOne");
		this.DisableTrigger("OnOwnershipChanged", "DefeatConditionsPlayerTwo");
		this.DisableTrigger("OnOwnershipChanged", "DefeatConditionsPlayerThree");

		this.DisableTrigger("OnStructureBuilt", "SpawnAndAttackAlliedVillage");
		PushGUINotification([1], markForTranslation("Elder: Aren't you even capable of building an Outpost!? Shame on you, go and return to your father!"));
		TriggerHelper.DefeatPlayer(1);
		return;
	}

	if (distance > 30) {
		//disable all defeat conditions
		this.DisableTrigger("OnOwnershipChanged", "DefeatConditionsPlayerOne");
		this.DisableTrigger("OnOwnershipChanged", "DefeatConditionsPlayerTwo");
		this.DisableTrigger("OnOwnershipChanged", "DefeatConditionsPlayerThree");

		this.DisableTrigger("OnStructureBuilt", "SpawnAndAttackAlliedVillage");
		PushGUINotification([1], markForTranslation("Elder: How can we use this Outpost if you didn't build it at the right place? Go and return to your father, I can't learn you anything!"));
		TriggerHelper.DefeatPlayer(1);
		return;
	}

	//spawn attackers
	var spawnPoint = "C";
	this.attackSize = 5;
	this.PlayerID = 3;

	var intruders = TriggerHelper.SpawnUnitsFromTriggerPoints(spawnPoint, "units/gaul_champion_fanatic", this.attackSize, this.PlayerID);

	for (var origin in intruders) {
		var cmd = null;

		for(var target of this.GetTriggerPoints("B")) 		{
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

	//enable next trigger and disable current
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

	var cmpPlayerManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_PlayerManager);
	var playerEnt = cmpPlayerManager.GetPlayerByID(1);

	var technames = ["phase_town_generic", "phase_city_gauls"];

	var cmpTechnologyManager = Engine.QueryInterface(playerEnt, IID_TechnologyManager); 

	for(var i = 0; i < technames.length; i++) {
		var template = cmpTechnologyManager.GetTechnologyTemplate(technames[i]);

		// check, if technology is already researched
		if (!cmpTechnologyManager.IsTechnologyResearched(technames[i]))
			cmpTechnologyManager.ResearchTechnology(technames[i]); 
	}

	//Add resources required to build a Civil Center

	this.PlayerID = 1;
	var resources = {
		"wood": 500,
		"stone": 500,
		"metal": 500
	};
	AddPlayerResources(this.PlayerID, resources);

	//spawn reinforcements
	var spawnPoint = "A";
	this.attackSize = 5;
	this.PlayerID = 1;

	var intruders = TriggerHelper.SpawnUnitsFromTriggerPoints(spawnPoint, "units/gaul_champion_infantry", this.attackSize, this.PlayerID);

	this.DoAfterDelay(200, "ReinforcementsMessage", {});
};

//END OF STORYLINE


//========================================= Garrisoning ships and unload at different place
/*
Trigger.prototype.GarrisonAndMove = function() {
	var ent = [258, 259];
	
	var cmd = {};
	cmd.type = "garrison";
	cmd.target = 260;
	warn(uneval(cmd.target));
	//warn(ent[i]);
	cmd.entities = ent;
	warn(uneval(cmd.entities));
	cmd.queued = true;
	ProcessCommand(0, cmd);



	var cmd = {};

	for(var target of this.GetTriggerPoints("F")) 		{
		var cmpPosition = Engine.QueryInterface(target, IID_Position);
		if (!cmpPosition || !cmpPosition.IsInWorld)
			continue;
			// store the x and z coordinates in the command
		cmd = cmpPosition.GetPosition();
		break;
	}
	cmd.type = "walk";
	cmd.entities = [260];
	cmd.queued = true;
	ProcessCommand(0, cmd);

	var entities = cmpTrigger.GetTriggerPoints("F");
	var data = {
		"entities": entities, // central points to calculate the range circles
		"players": [0], // only count entities of player 1
		"maxRange": 20,
		"requiredComponent": IID_UnitAI, // only count units in range
		"enabled": true,
	};
	cmpTrigger.RegisterTrigger("OnRange", "Unload", data);

}

Trigger.prototype.Unload = function(data) {
	this.DisableTrigger("OnRange", "Unload");

	var cmd = {};
	cmd.type = "unload-all";
	cmd.garrisonHolders = [260];
	cmd.queued = true;
	ProcessCommand(0, cmd);
}
*/
//========================================= End of Garrisoning and unload at different place

var cmpTrigger = Engine.QueryInterface(SYSTEM_ENTITY, IID_Trigger);
var data = {"enabled": true};

//Arm a number of triggers that are required to run along side the storyline
cmpTrigger.RegisterTrigger("OnOwnershipChanged", "DefeatConditionsPlayerOne", data);
cmpTrigger.RegisterTrigger("OnOwnershipChanged", "DefeatConditionsPlayerTwo", data);
cmpTrigger.RegisterTrigger("OnOwnershipChanged", "DefeatConditionsPlayerThree", data);
cmpTrigger.RegisterTrigger("OnPlayerCommand", "PlayerCommandHandler", data);

//Start storyline by arming the first OnRange trigger and posting a message 
var entities = cmpTrigger.GetTriggerPoints("B");
var data = {
	"entities": entities, // central points to calculate the range circles
	"players": [1], // only count entities of player 1
	"maxRange": 20,
	"requiredComponent": IID_UnitAI, // only count units in range
	"enabled": true,
};
cmpTrigger.RegisterTrigger("OnRange", "VisitVillage", data);

