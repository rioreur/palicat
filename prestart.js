sc.Inventory.inject({
	onload: function (a) {
		a["items"].push({
			"order": 101,
			"name": {
				"en_US": "Palicat",
				"de_DE": "Palicat",
				"fr_FR": "Palicat",
				"zh_CN": "Palicat",
				"ja_JP": "Palicat",
				"ko_KR": "Palicat",
				"langUid": 20001
			},
			"description": {
				"en_US": "A trustful companion",
				"de_DE": "",
				"fr_FR": "Un companion de confiance",
				"zh_CN": "",
				"ja_JP": "",
				"ko_KR": "",
				"langUid": 20002
			},
			"type": "TOGGLE",
			"rarity": 0,
			"cost": 1000,
			"level": 1,
			"icon": "item-toggle",
			"noTrack": false,
			"effect": {
				"sheet": "drops",
				"name": "circle"
			},
			"customItem": "palicat-pet"	// To label it as a custom item so it could be recognize by CCItemAPI
		});
		this.parent(a);
	}
});