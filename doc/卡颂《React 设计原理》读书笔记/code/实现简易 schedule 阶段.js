/**
 * 第一版调度系统
 */
// const insertItem = content => {
// 	const ele = document.createElement('span');
// 	ele.innerText = `${content}`;
// 	contentBox.appendChild(ele);
// };
// // 一个 work 需要向页面插入100个元素(即执行100次insertItem方法)
// const work1 = {
// 	count: 100
// };
// // 保存所有work的队列
// const workQueue = [];
// // 调度
// function schedule() {
// 	const curWork = workQueue.pop();
// 	if (curWork) {
// 		perform(curWork);
// 	}
// }
// // 执行
// function perform(work) {
// 	while (work.count > 0) {
// 		work.count--;
// 		insertItem();
// 	}
// 	schedule();
// }
// // 开始调度
// button.onclick = () => {
// 	workQueue.unshift({
// 		count: 100
// 	});
// 	schedule();
// };

/**
 * 第二版调度系统
 */
const insertItem = content => {
	const ele = document.createElement('span');
	ele.innerText = `${content}`;
	contentBox.appendChild(ele);
};
// 一个 work 需要向页面插入100个元素(即执行100次insertItem方法)
const work1 = {
	count: 100,
	priority: NormalPriority
};
// 保存所有work的队列
const workQueue = [];
// 上一次执行perform的work对应的优先级
let prePriority = IdlePriority;
// 当前调度的callback
let curCallback = null;
// 调度
function schedule() {
	// 尝试获取当前正在调度的callback
	const cdNode = getFirstCallbackNode();
	// 找出优先级最高的work，即priority最小的work
	const curWork = workQueue.sort((a, b) => a.priority - b.priority)[0];
	if (!curWork) {
		curCallback = null;
		cdNode && cancelIdleCallback(cdNode);
		return;
	}
	// 获取当前需要调度的work的优先级
	const curPriority = curWork.priority;
	// 如果当前优先级和上一次执行perform的优先级相同，则继续使用上一次执行perform的callback
	if (curPriority === prePriority) {
		// 不需要重新调度
		return;
	}
	// 调度开始之前，中断正在执行的callback
	cdNode && cancelIdleCallback(cdNode);
	// 重新调度
	curCallback = scheduleCallback(curPriority, perform.bind(null, curWork));
}
// 执行
function perform(work) {
	// 判断是否需要同步执行：
	// 1、当前优先级是否为ImmediatePriority，如果是则需要同步执行
	// 2、didTimeout表示work.expirationTime小于当前时间，代表work过期，需要同步执行。（此举是为了防止work饥饿问题，饥饿问题是指低优先级的work不断被新插入的高优先级work打断从而一直不能执行）
	const needSync = work.priority === ImmediatePriority || didTimeout;
	// 当 work.count 过大或者insertItem执行时间过长时，会造成预留给当前callback的时间耗尽（默认是5ms），shouldYield()会返回true，导致提前退出perform（循环中断）
	while (work.count > 0 && (needSync || !shouldYield())) {
		work.count--;
		insertItem();
	}
	// 跳出循环，prePriority更新为当前work的优先级
	prePriority = work.priority;
	if (!work.count) {
		// 当前work执行完毕，从队列中移除
		const workIndex = workQueue.indexOf(work);
		workQueue.splice(workIndex, 1);
		// 重置prePriority
		prePriority = IdlePriority;
	}
	const preCallback = curCallback;
	// 调度完成后，如果callback发生变化，代表这是新的work，需要重新调度
	schedule();
	const newCallback = curCallback;
	if (newCallback && newCallback === preCallback) {
		// callback不变，代表是同一个work，只是Time Slice耗尽了，需要继续执行
		return perform.bind(null, work);
	}
}
// 开始调度
button.onclick = () => {
	workQueue.unshift({
		count: 100
	});
	schedule();
};
