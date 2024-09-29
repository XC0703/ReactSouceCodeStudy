class SynctheneticEvent {
	constructor(e) {
		// 保留原生事件对象
		this.nativeEvent = e;
	}
	stopPropagation() {
		this._stopPropagation = true;
		if (this.nativeEvent.stopPropagation) {
			// 调用原生事件的stopPropagation方法
			this.nativeEvent.stopPropagation();
		}
	}
}
