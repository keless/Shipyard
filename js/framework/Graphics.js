"use strict"; //ES6
//#include https://code.jquery.com/ui/1.11.0/jquery-ui.min.js
//NOTE: jQuery using "jQuery()"" format, not "$()"
//#include js/framework/Service.js

class Graphics {
	constructor( strCanvasName ) {
		this.canvas = jQuery('#'+strCanvasName)[0];
		this.fillStyle = "#FF0000";
		this.strokeStyle = "#FFFFFF";
		this.strokeSize = 1;
		this.font = "30px Arial";
		
		this.ctx = null;
		this.drawCentered = Config ? Config.areSpritesCentered : false;
		this.verbose = false;
		
		Service.add("gfx", this);
	}
	
	getWidth() {
		return this.canvas.clientWidth;
	}
	getHeight() {
		return this.canvas.clientHeight;
	}
	
	begin( bShouldClear ) {
		this.ctx = this.canvas.getContext("2d");
		if(bShouldClear) {
			this.clearAll();
		}
	}
	clearAll() {
		this.ctx.clearRect(0,0, this.getWidth(), this.getHeight());
	}
	
	saveMatrix() {
		this.ctx.save();
	}
	restoreMatrix() {
		this.ctx.restore();
	}
	translate(x,y) {
		this.ctx.translate(x, y);
	}
	rotate(radians, ccw ) {
		if(ccw) radians *= -1;
		this.ctx.rotate(radians);
	}
	scale( scaleVal ) {
		this.ctx.scale( scaleVal, scaleVal );
	}
	
	///note: origin (0,0) is top left
	drawRect( x,y,w,h ) {
		this.ctx.fillStyle = this.fillStyle;
		
		if(this.verbose) console.log("rect at " + x +"," + y + " x " + w+","+h);
		if(this.drawCentered) {
			x -= w/2;
			y -= h/2;
		}
		this.ctx.fillRect(x,y,w,h);
		
	}
	drawRectEx( x,y,w,h, fillStyle ) {
		this.ctx.fillStyle = fillStyle || this.fillStyle;
		
		if(this.verbose) console.log("rect at " + x +"," + y + " x " + w+","+h);
		if(this.drawCentered) {
			x -= w/2;
			y -= h/2;
		}
		this.ctx.fillRect(x,y,w,h);
		
	}
	drawRectOutline( x,y, w,h ) {
		this.ctx.strokeStyle = this.strokeStyle;
		this.ctx.lineWidth = this.strokeSize;
		
		if(this.verbose) console.log("rect at " + x +"," + y + " x " + w+","+h);
		if(this.drawCentered) {
			x -= w/2;
			y -= h/2;
		}
		this.ctx.strokeRect(x,y,w,h);
	}
	drawRectOutlineEx( x,y, w,h, strokeStyle, strokeWidth ) {
		this.ctx.strokeStyle = strokeStyle || this.strokeStyle;
		this.ctx.lineWidth = strokeWidth || this.strokeSize;
		
		if(this.verbose) console.log("rect at " + x +"," + y + " x " + w+","+h);
		if(this.drawCentered) {
			x -= w/2;
			y -= h/2;
		}
		this.ctx.strokeRect(x,y,w,h);
	}
	drawLine(x1,y1, x2,y2) {
		this.ctx.strokeStyle = this.strokeStyle;
		
		this.ctx.beginPath();
		this.ctx.moveTo(x1,y1);
		this.ctx.lineTo(x2,y2);
		this.ctx.stroke();
		this.ctx.closePath();
		if(this.verbose) console.log("line at " + x1 +"," + y1 + " x " + x2+","+y2); 
	}
	drawLineEx(x1,y1, x2,y2, strokeStyle) {
		this.ctx.strokeStyle = strokeStyle || this.strokeStyle;
		
		this.ctx.beginPath();
		this.ctx.moveTo(x1,y1);
		this.ctx.lineTo(x2,y2);
		this.ctx.stroke();
		this.ctx.closePath();
		if(this.verbose) console.log("line at " + x1 +"," + y1 + " x " + x2+","+y2); 
	}
	drawCircle(x1,y1, radius) {
		//set state
		this.ctx.fillStyle = this.fillStyle;
		this.ctx.strokeStyle = this.strokeStyle;
		this.ctx.lineWidth = this.strokeSize;
		
		//draw
		this.ctx.beginPath();
		this.ctx.arc(x1, y1, radius, 0, 2 * Math.PI, false); //false=clockwise
		if(this.ctx.fillStyle != "") {
			this.ctx.fill();
		}
		if(this.ctx.strokeStyle != "") {
			this.ctx.stroke();
		}
		this.ctx.closePath();
		
		if(this.verbose) console.log("circle at " + x1 +"," + y1 + " x " + radius);
	}
	drawCircleEx(x1,y1, radius, fillStyle, strokeStyle, strokeSize) {
		//set state
		this.ctx.fillStyle = fillStyle || this.fillStyle;
		this.ctx.strokeStyle = strokeStyle || this.strokeStyle;
		this.ctx.lineWidth = strokeSize || this.strokeSize;
		
		//draw
		this.ctx.beginPath();
		this.ctx.arc(x1, y1, radius, 0, 2 * Math.PI, false); //false=clockwise
		if(this.ctx.fillStyle != "") {
			this.ctx.fill();
		}
		if(this.ctx.strokeStyle != "") {
			this.ctx.stroke();
		}
		this.ctx.endPath();
	}
	drawText(strText, x,y ) {
		this.ctx.font = this.font;
		this.ctx.fillStyle = this.fillStyle;
		if(this.drawCentered) {
			var sized = this.ctx.measureText(strText);
			x -= sized.width/2;
			//y -= sized.height/2;
		}
		this.ctx.fillText(strText,x,y);
	}
	drawTextEx(strText, x,y, font, fillStyle ) {
		this.ctx.font = font;
		this.ctx.fillStyle = fillStyle;
		if(this.drawCentered) {
			var sized = this.ctx.measureText(strText);
			x -= sized.width/2;
			//y -= sized.height/2;
		}
		this.ctx.fillText(strText,x,y);
	}
	drawImage(img, x,y) {
		if(this.drawCentered) {
			x -= img.width/2;
			y -= img.height/2;
		}
		this.ctx.drawImage(img, x,y);
	}
	/// dx,dy are destination (on screen) coordinates
	/// srcx,srcy are source image (in texture) coordinates
	/// srcw,srch are source image width and height to capture
	/// this function forces 1:1 scale of source w,h to dest w,h
	drawImageSub(img, dx,dy,  srcx, srcy, srcw, srch, hFlip) {
		
		if(this.drawCentered) {
			dx -= srcw/2;
			dy -= srch/2;
		}
		if(!hFlip) {
			this.ctx.drawImage(img, srcx,srcy,srcw,srch, dx,dy, srcw,srch);
		}else {
			this.ctx.save();
			this.ctx.scale(-1,1);			
			this.ctx.drawImage(img, srcx,srcy,srcw,srch, (dx*-1) - srcw ,dy, srcw,srch);
			this.ctx.restore();
			//todo: reset scale 1,1 instead of save/restore
		}
	}
	
	drawImageTiled(img, x,y, w,h, scale) {
		if(this.drawCentered) {
			x -= w/2;
			y -= h/2;
		}
		
		scale = scale || 1.0;
		var tileW = img.width * scale;
		var tileH = img.height * scale;
		var numTilesW = w / tileW;
		var numTilesH = h / tileH;
		
		for(var ty=0; ty<numTilesH; ty++) {
			for(var tx=0; tx<numTilesW; tx++) {
				this.ctx.drawImage(img, x + tx*tileW,y + ty*tileH, tileW, tileH);
			}
		}
	}
}

/**
 * Sprite class represents a series of frames inside of an atlas texture
 * @image - texture atlas image to use as source image for drawing frames
 * @format - "xywh" for individual rect information per frame, or "grid" for equally spaced grid of frames
 * @width - sprite width (note: in "xywh" format, individual frames are not guaranteed to have the same width)
 * @width - sprite width (note: in "xywh" format, individual frames are not guaranteed to have the same height)
 * @paddingX - optional; space between source edges and interior size
 * @paddingY - optional; space between source edges and interior size
 * @frames - if format is "xywh"; contains all the frame rectangles as an array of arrays
 *  data = {"image":"imageName.png", "format":"xywh", "width":96, "height":96, "frames":[  [x,y,w,h],[x,y,w,h],[x,y,w,h],[x,y,w,h] ]}
 *  data = {"image":"derpy.png", "format":"grid", "width":96, "height":96, "paddingX":5, "paddingY":5 }
 */
class Sprite {
	constructor( path ) {
		this.fullPath = path;
		this.path = path.substring(0, path.lastIndexOf("/")+1);
		this.img = null;
		this.data = null;
		this.isLoaded = false;
	}
	
	//called by ResourceProvider
	_load( dataJson, fnOnLoad ) {
		var resourceProvider = Service.get("rp");
		this.data = dataJson;
		this.format = dataJson["format"] || "xywh";
		
		var self = this;
		this.img = resourceProvider.getImage(this.path + dataJson["image"], function(e){
			if(!self.isLoaded) {
				self.img = e.res;
				self.isLoaded = true; //deferred load
				if(self.verbose) console.log("sprite loaded late: " + self.fullPath);
				if(fnOnLoad) fnOnLoad();
			}
		});
		if(this.img) {
			this.isLoaded = this.img.isLoaded; //check for immediate load
			if(this.verbose) console.log("sprite loaded immediately: " + self.fullPath)
			if(this.isLoaded && fnOnLoad) fnOnLoad();
		}
	}
	
	getWidth() {
		return this.data.width - this.getPaddingX()*2;
	}
	getHeight() { 
		return this.data.height - this.getPaddingY()*2;
	}
	getPaddingX() {
		return this.data.paddingX || 0;
	}
	getPaddingY() {
		return this.data.paddingY || 0;
	}
	getFPS() {
		return this.data.fps || 30;
	}
	getNumFrames() {
		if( this.format == "xywh" || this.format == "gridSub" ) {
			return this.data.frames.length;
		}
		else if( this.format == "grid" ) {
			var frameW = this.data.width;
			var frameH = this.data.height;
			var texW = this.img.width;
			var framesPerRow = Math.floor(texW / frameW);
			var numRows = Math.floor(this.img.height / frameH);
			return numRows * framesPerRow;
		}
		return 0;
	}
	
	drawFrame( gfx, x, y, frameIdx, hFlip ) {
		if( this.format == "xywh") {
			var frameData = this.data.frames[frameIdx];
			gfx.drawImageSub( this.img, x - this.getPaddingX(), y - this.getPaddingY(),  frameData[0], frameData[1], frameData[2], frameData[3], hFlip);
		}
		else if( this.format == "grid" || this.format == "gridSub") {
			
			if(this.format == "gridSub") {
				//get sub-grid indexed frames
				frameIdx = this.data.frames[frameIdx];
			}
			
			var frameW = this.data.width;
			var frameH = this.data.height;
			var texW = this.img.width;
			var framesPerRow = Math.floor(texW / frameW);
			var row = frameIdx % framesPerRow;
			var col = (frameIdx - row) / framesPerRow;
			gfx.drawImageSub(this.img, x - this.getPaddingX(), y - this.getPaddingY(), row*frameW, col*frameH, frameW, frameH, hFlip);
		}

	}
}
