"use strict"; //ES6
//#include js/framework/Graphics.js

//scene node heirarchy of sprites/animations

//TODO: update to use BaseView??

class NodeView {
	constructor( ) {
		this.pos = new Vec2D();
		this.rotation = 0;

		this.children = [];
		this.parent = null;

		this.fnCustomDraw = [];
	}
	
	Destroy() {
		//override me to clean up
		for(let child of this.children) {
			child.Destroy();
		}
	}
	
	get worldRotation() {
		if(this.parent) {
			return this.parent.worldRotation + this.rotation;
		}
		return this.rotation;
	}
	
	setCircle( radius ) {
		if(this.circleRadius) {
			console.error("NodeView: already has a circle, abort!");
			return;
		}
		this.circleRadius = radius;
		var self = this;
		this.fnCustomDraw.push(function(gfx, x,y, ct){
			gfx.drawCircle(x, y, self.circleRadius);
		});
	}
	setRect( w, h, fillStyle ) {
		if(this.image) {
			console.error("NodeView: already has a rect, abort!");
			return;
		}
		this.size = new Vec2D(w, h);
		//var self = this;
		this.fnCustomDraw.push(function(gfx, x,y, ct){
			gfx.drawRectEx(x, y, w, h, fillStyle);
		});
	}
	setImage( image ) {
		if(this.image) {
			console.error("NodeView: already has an image, abort!");
			return;
		}
		this.image = image;
		var self = this;
		this.fnCustomDraw.push(function(gfx, x,y, ct){
			gfx.drawImage(self.image, x, y);
		});
		
	}
	setSprite( sprite, spriteFrame, hFlip ) {
		hFlip = hFlip || false;
		if(this.sprite) {
			console.error("NodeView: already has a sprite, abort!");
			return;
		}
		this.sprite = sprite;
		this.spriteFrame = spriteFrame;
		this.hFlip = hFlip;
		var self = this;
		this.fnCustomDraw.push(function(gfx, x,y, ct){
			self.sprite.drawFrame(gfx, x, y, self.spriteFrame, self.hFlip);
		});
	}
	setAnim( anim ) {
		if(this.animInstance) {
			console.error("NodeView: already has an anim, abort!");
			return;			
		}
		this.animInstance = new AnimationInstance( anim );
		var self = this;
		this.fnCustomDraw.push(function(gfx, x,y, ct){
			self.animInstance.update(ct);
			self.animInstance.draw(gfx, x, y, self.hFlip);
		});

		//thin wrappers for AnimationInstance
		this.animEvent = function( ct, evt ) {
			this.animInstance.event(ct, evt);
		}
		this.startAnim = function(ct, animState) {
			this.animInstance.startAnim(ct, animState);
		}
	}
	setLabel( labelText, labelFont, labelStyle ) {
		if(this.labelText) {
			console.error("NodeView: already has a label, abort!");
			return;	
		}
		this.labelText = labelText;
		this.labelFont = labelFont;
		this.labelStyle = labelStyle;
		var self = this;
		this.fnCustomDraw.push(function(gfx, x,y, ct){
			gfx.drawTextEx(self.labelText, x, y, self.labelFont, self.labelStyle);
		});
	}
	updateLabel( labelText ) {
		if(!this.labelText) {
			console.error("NodeView: cant update label, dont have one!");
			return;	
		}
		this.labelText = labelText;
	}
	updateLabelStyle( style ) {
		this.labelStyle = style;
	}
	
	///fn(gfx, x,y, ct)
	addCustomDraw( fn ) {
		this.fnCustomDraw.push(fn);
	}
	
	//x,y should be sent relative to node origin
	OnMouseDown(e, x,y) {
		
		//make local to self origin
		x -= this.pos.x;
		y -= this.pos.y;
		//rotate
		if(this.rotation != 0) {
			var v = new Vec2D(x,y);
			v.rotate(-this.rotation);
			x = v.x;
			y = v.y;
		}
		
		for(let child of this.children) {
			child.OnMouseDown(e, x, y);
		}
	}
	
	//node heirarchy functions
	addChild( child ) {
		child.removeFromParent();
		
		this.children.push(child);
		child.parent = this;
	}
	removeFromParent(shouldDestroy) {
		shouldDestroy = shouldDestroy || false;
		if(!this.parent) return;
		this.parent.removeChild(this, shouldDestroy);
		this.parent = null;
	}
	
	removeChild(child, shouldDestroy) {
		shouldDestroy = shouldDestroy || false;
		var childIdx = this.children.indexOf(child);
		this.removeChildByIdx(childIdx, shouldDestroy);
	}
	removeChildByIdx( childIdx, shouldDestroy ) {
		shouldDestroy = shouldDestroy || false;
		if(childIdx < 0) return;
		var child = this.children.splice(childIdx, 1)[0];
		if(child.parent === this) child.parent = null;
		if(shouldDestroy) child.Destroy();
	}
	removeAllChildren( shouldDestroy ) { 
		shouldDestroy = shouldDestroy || false;
		for( var i=(this.children.length-1); i >= 0; i--) {
			var child = this.children[i];
			this.removeChild(child, shouldDestroy);
		}
	}
	//TODO: support string path lookup

	//draw function
	draw( gfx, x, y, ct ) {
		
		gfx.saveMatrix();
		gfx.translate(x + this.pos.x, y + this.pos.y);

		if(this.rotation != 0) {
			gfx.rotate(this.rotation);
		}
		
		for(let f of this.fnCustomDraw) {
			f(gfx, x,y, ct);
		}
		
		for(let child of this.children) {
			//note: dont subtract this.pos, since we're using gfx.translate
			child.draw(gfx, x, y, ct);
		}

		gfx.restoreMatrix();
	}
}