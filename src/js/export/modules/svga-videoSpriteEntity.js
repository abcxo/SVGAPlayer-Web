
import SVGAAdapter from './svga-adapter'
import SVGAVideoSpriteFrameEntity from './svga-videoSpriteFrameEntity'
import SVGABezierPath from './svga-bezierPath'
import SVGARectPath from './svga-rectPath'
import SVGAEllipsePath from './svga-ellipsePath'

let SVGAVectorLayerAssigner = (obj) => {
    Object.assign(obj, {
        drawedFrame: 0,
        frames: [],
        keepFrameCache: {},
        init(frames) {
            obj.frames = frames;
            obj.resetKeepFrameCache();
        },
        stepToFrame: (frame) => {
            if (frame < obj.frames.length) {
                obj.drawFrame(frame);
            }
        },
        resetKeepFrameCache() {
            obj.keepFrameCache = {}
            let lastKeep = 0;
            obj.frames.forEach((frameItem, idx) => {
                if (!obj.isKeepFrame(frameItem)) {
                    lastKeep = idx;
                }
                else {
                    obj.keepFrameCache[idx] = lastKeep;
                }
            });
        },
        requestKeepFrame: (frame) => {
            return obj.keepFrameCache[frame]
        },
        isKeepFrame: (frameItem) => {
            return frameItem.shapes && frameItem.shapes.length > 0 && frameItem.shapes[0].type === "keep";
        },
        drawFrame: (frame) => {
            if (frame < obj.frames.length) {
                let frameItem = obj.frames[frame];
                if (obj.isKeepFrame(frameItem)) {
                    if (obj.drawedFrame === obj.requestKeepFrame(frame)) {
                        return;
                    }
                }
                obj.removeAllChildren();
                frameItem.shapes.forEach((shape) => {
                    if (shape.type === "shape" && shape.args && shape.args.d) {
                        let bezierPath = new SVGABezierPath(shape.args.d, shape.transform, shape.styles);
                        obj.addChild(bezierPath.getShape());
                    }
                    if (shape.type === "ellipse" && shape.args) {
                        let bezierPath = new SVGAEllipsePath(parseFloat(shape.args.x) || 0.0, parseFloat(shape.args.y) || 0.0, parseFloat(shape.args.radiusX) || 0.0, parseFloat(shape.args.radiusY) || 0.0, shape.transform, shape.styles);
                        obj.addChild(bezierPath.getShape());
                    }
                    if (shape.type === "rect" && shape.args) {
                        let bezierPath = new SVGARectPath(parseFloat(shape.args.x) || 0.0, parseFloat(shape.args.y) || 0.0, parseFloat(shape.args.width) || 0.0, parseFloat(shape.args.height) || 0.0, parseFloat(shape.args.cornerRadius) || 0.0, shape.transform, shape.styles);
                        obj.addChild(bezierPath.getShape());
                    }
                })
                obj.drawedFrame = frame;
            }
        },
    });
}

module.exports = class SVGAVideoSpriteEntity {
    
    /**
     * string
     */
    imageKey = null

    /**
     * SVGAVideoSpriteFrameEntity[]
     */
    frames = []

    constructor(spec) {
        if (spec) {
            this.imageKey = spec.imageKey;
            if (spec.frames) {
                this.frames = spec.frames.map((obj) => {
                    return new SVGAVideoSpriteFrameEntity(obj)
                })
            }
        }
    }

    requestLayer(bitmap) {
        let layer = SVGAAdapter.Container();
        if (bitmap != null) {
            this._attachBitmapLayer(layer, bitmap);
        }
        this._attachVectorLayer(layer);
        layer.stepToFrame = (frame) => {
            if (frame < this.frames.length) {
                let frameItem = this.frames[frame];
                if (frameItem.alpha > 0.0) {
                    layer.visible = true;
                    layer.alpha = frameItem.alpha;
                    SVGAAdapter.setBounds(layer, {x: frameItem.layout.x, y: frameItem.layout.y, width: frameItem.layout.width, height: frameItem.layout.height});
                    layer.setTransformMatrix(SVGAAdapter.Matrix2D(frameItem.transform.a, frameItem.transform.b, frameItem.transform.c, frameItem.transform.d, frameItem.transform.tx, frameItem.transform.ty));
                    layer.mask = frameItem.maskShape;
                    if (layer.mask) {
                        layer.mask.setTransformMatrix(layer.transformMatrix);
                    }
                    if (layer.bitmapLayer && typeof layer.bitmapLayer.stepToFrame === "function") {
                        layer.bitmapLayer.stepToFrame(frame);
                    }
                    if (layer.vectorLayer && typeof layer.vectorLayer.stepToFrame === "function") {
                        layer.vectorLayer.stepToFrame(frame);
                    }
                    if (layer.textLayer) {
                        layer.textLayer.textBaseline = "middle"
                        layer.textLayer.x = (frameItem.layout.width - layer.textLayer.getBounds().width) / 2.0 + layer.textLayer.offset.x;
                        layer.textLayer.y = frameItem.layout.height / 2.0 + layer.textLayer.offset.y;
                    }
                }
                else {
                    layer.visible = false;
                }
            }
        }
        return layer;
    }

    _attachBitmapLayer(layer, bitmap) {
        layer.bitmapLayer = SVGAAdapter.Bitmap(bitmap);
        layer.bitmapLayer.frames = this.frames;
        layer.bitmapLayer.stepToFrame = (frame) => {}
        layer.addChild(layer.bitmapLayer);
    }

    _attachVectorLayer(layer) {
        layer.vectorLayer = SVGAAdapter.Container();
        SVGAVectorLayerAssigner(layer.vectorLayer);
        layer.vectorLayer.init(this.frames)
        layer.addChild(layer.vectorLayer);
    }

}