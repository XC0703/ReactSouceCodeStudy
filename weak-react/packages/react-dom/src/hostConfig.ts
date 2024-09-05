import { FiberNode } from 'react-reconciler/src/fiber';
import { HostComponent, HostText } from 'react-reconciler/src/workTags';
import { DOMElement, updateFiberProps } from './SyntheticEvent';

export type Container = Element;
export type Instance = Element;
export type TextInstance = Text;

export const createInstance = (type: string, porps: any): Instance => {
	// 处理 props
	const element = document.createElement(type) as unknown;
	updateFiberProps(element as DOMElement, porps);
	return element as DOMElement;
};

export const appendInitialChild = (
	parent: Instance | Container,
	child: Instance
) => {
	parent.appendChild(child);
};

export const createTextInstance = (content: string) => {
	const element = document.createTextNode(content);
	return element;
};

export const appendChildToContainer = (
	child: Instance,
	parent: Instance | Container
) => {
	parent.appendChild(child);
};

export const commitUpdate = (fiber: FiberNode) => {
	switch (fiber.tag) {
		case HostComponent:
			// 处理 props
			return updateFiberProps(fiber.stateNode, fiber.memoizedProps);
		case HostText:
			const text = fiber.memoizedProps.content;
			return commitTextUpdate(fiber.stateNode, text);
		default:
			if (__DEV__) {
				console.warn('未实现的 commitUpdate 类型', fiber);
			}
	}
};

export const commitTextUpdate = (
	textInstance: TextInstance,
	content: string
) => {
	textInstance.textContent = content;
};

export const removeChild = (
	child: Instance | TextInstance,
	container: Container
) => {
	container.removeChild(child);
};

export const insertChildToContainer = (
	child: Instance,
	container: Container,
	before: Instance
) => {
	container.insertBefore(child, before);
};
