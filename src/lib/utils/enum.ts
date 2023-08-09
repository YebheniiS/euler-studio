class Tool {
	static Select = new Tool('Select');
	static Point = new Tool('Point');
	static PointOnCurve = new Tool('PointOnCurve');
	static Line = new Tool('Line');
	static Polygon = new Tool('Polygon');
	static ShapeFromCurves = new Tool('ShapeFromCurves');
	static Text = new Tool('Text');
	static RotateAboutPoint = new Tool('RotateAboutPoint');
	static ScaleAboutPoint = new Tool('ScaleAboutPoint');

	constructor(public name: string) {}
	toString() {
		return `Tool.${this.name}`;
	}
}

export { Tool };
