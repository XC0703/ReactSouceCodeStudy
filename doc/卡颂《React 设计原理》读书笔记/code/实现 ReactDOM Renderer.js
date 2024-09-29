import ReactReconciler from 'react-reconciler';

const hostConfig = {
	getRootHostContext: () => {
		return {};
	},
	getChildHostContext: () => {
		return {};
	},
	prepareForCommit: () => true,
	resetAfterCommit: () => {},
	// 判断是否为文本节点
	shouldSetTextContent: (_, props) => {
		return typeof props.children === 'string' || typeof props.children === 'number';
	},
	// 创建 DOM Element
	createInstance: (type, newProps, rootContainerInstance, _currentHostContext, workInProgress) => {
		const domElement = document.createElement(type);
		Object.keys(newProps).forEach(propName => {
			const propValue = newProps[propName];
			if (propName === 'children') {
				if (typeof propValue === 'string' || typeof propValue === 'number') {
					domElement.textContent = propValue;
				}
			} else if (propName === 'onClick') {
				domElement.addEventListener('click', propValue);
			} else if (propName === 'className') {
				domElement.setAttribute('class', propValue);
			} else {
				const propValue = newProps[propName];
				domElement.setAttribute(propName, propValue);
			}
		});
		return domElement;
	},
	createTextInstance: text => {
		return document.createTextNode(text);
	},
	// 设置 DOM Element 属性
	finalizeInitialChildren: () => {},
	clearContainer: () => {},
	// 插入DOM，对应`Placement flag`
	appendInitialChild: (parent, child) => {
		parent.appendChild(child);
	},
	appendChild(parent, child) {
		parent.appendChild(child);
	},
	supportsMutation: true,
	appendChildToContainer: (parent, child) => {
		parent.appendChild(child);
	},
	prepareUpdate(domElement, oldProps, newProps) {
		return true;
	},
	commitUpdate(domElement, updatePayload, type, oldProps, newProps) {
		Object.keys(newProps).forEach(propName => {
			const propValue = newProps[propName];
			if (propName === 'children') {
				if (typeof propValue === 'string' || typeof propValue === 'number') {
					domElement.textContent = propValue;
				}
			} else {
				const propValue = newProps[propName];
				domElement.setAttribute(propName, propValue);
			}
		});
	},
	commitTextUpdate(textInstance, oldText, newText) {
		textInstance.text = newText;
	},
	// 删除dom，对应 ChildDeletion flag
	removeChild(parentInstance, child) {
		parentInstance.removeChild(child);
	}
};
const ReactReconcilerInst = ReactReconciler(hostConfig);
export default {
	render: (reactElement, domElement, callback) => {
		// 创建 root Container
		if (!domElement._rootContainer) {
			domElement._rootContainer = ReactReconcilerInst.createContainer(domElement, false);
		}

		// 更新 root Container
		return ReactReconcilerInst.updateContainer(
			reactElement,
			domElement._rootContainer,
			null,
			callback
		);
	}
};
