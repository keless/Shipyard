"use strict"; //ES6

/**
 * view class for displaying loading information while ensuring resources are loaded (before moving to a state that assumes they are all loaded)
 * 
 * Accepts an array of resource strings to load
 * 	will parse the strings by extention to determine resource types to load as (defaults to json blob)
 * 
 * Sends EventBus.ui.dispatch({evtName:"loadingComplete"}); when completed
 * 
 */

class LoadingView {
	constructor( resNameArr ) {
		this.resLoaded = 0;
		this.resToLoad = resNameArr;
		this.numToLoadTotal = resNameArr.length;
		this.loadingName = "";
		
		this._loadNext();
	}
	
	_loadNext() {
		var RP = Service.get("rp");
		if(this.resToLoad.length == 0) {
			this.loadingName = "completed";
			EventBus.ui.dispatch({evtName:"loadingComplete"});
			return;
		}
		
		this.loadingName = this.resToLoad[0];
		this.resToLoad.splice(0,1); //remove from front
		var self = this;
		
		var ext = this.loadingName.substr(this.loadingName.lastIndexOf('.') + 1);
		
		switch(ext) {
			case "png":
			case "PNG":
			case "bmp":
			case "BMP":
			case "jpg":
			case "JPG":
				RP.loadImage(this.loadingName, function(e){
					self._loadNext(); //recursion inside of anonymous function, yay!
				});
			break;
			case "sprite":
				RP.loadSprite(this.loadingName, function(e){
					self._loadNext(); //recursion inside of anonymous function, yay!
				});
			break;
			//case "anim":
			//case "json":
			default:
				RP.loadJson(this.loadingName, function(e){
					self._loadNext(); //recursion inside of anonymous function, yay!
				});
			break;
		}
		
		

	}
	
	Draw( g, x,y, ct) {
		g.drawRectEx(g.getWidth()/2,g.getHeight()/2, g.getWidth(), g.getHeight(), "#000000");
		g.drawText("(%) loading: " + this.loadingName, g.getWidth()/2, 50);
	}
}