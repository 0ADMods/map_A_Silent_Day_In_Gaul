//========================================= Garrisoning ships and unload at different place

Trigger.prototype.GarrisonAndMove = function() {
	
	//entityIDs to be garrisoned
	var ent = [258, 259];
	
	var cmd = {};
	cmd.type = "garrison";
	//garrisonholder entity ID
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

//========================================= End of Garrisoning and unload at different place

var cmpTrigger = Engine.QueryInterface(SYSTEM_ENTITY, IID_Trigger);