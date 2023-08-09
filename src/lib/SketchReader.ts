// import type { SqlQuerySpec } from '@azure/cosmos';
// import { cosmosDbClient } from '$lib/utils/cosmosDb';
import * as Geometry from '$lib/studio/geometry';
import * as Text from '$lib/studio/text';

class SketchReader {
	private _children: Array<Geometry.Shape | Text.Text> | null;

	constructor(public sketchName: string) {
		this._children = null;
	}
	// get children() {
	// 	return (async () => {
	// 		if (this._children === null) {
	// 			const userDataContainer = await cosmosDbClient.database('Studio').container('UserData');
	// 			const querySpec: SqlQuerySpec = {
	// 				query: 'SELECT * FROM UserData sketch WHERE sketch.name = @name',
	// 				parameters: [{ name: '@name', value: this.sketchName }]
	// 			};
	// 			const { resources: items } = await userDataContainer.items.query(querySpec).fetchAll();
	// 			const shapeData = items[0].shapes;

	// 			this._children = [];
	// 			for (const d of shapeData) {
	// 				const json = JSON.parse(d);
	// 				const className = json.class;
	// 				if (class === 'Text') {
	// 					const jsonText = Text.textFromJson(json);
	// 					this._children.push(jsonText);
	// 				} else {
	// 					const jsonShape = Geometry.shapeFromJson(json);
	// 					this._children.push(jsonShape);
	// 				}
	// 			}
	// 		}

	// 		return this._children;
	// 	})();
	// }
}

export { SketchReader };
