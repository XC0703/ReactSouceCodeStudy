import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react()],
	// 添加一些全局环境变量，防止运行时报错：xxx is not defined
	define: {
		__DEV__: true,
		__PROFILE__: true,
		__UMD__: true,
		__EXPERIMENTAL__: true
	},
	// 将相关包的路径重定向
	resolve: {
		alias: {
			react: path.posix.resolve('src/react/packages/react'),
			'react-dom': path.posix.resolve('src/react/packages/react-dom'),
			'react-reconciler': path.posix.resolve('src/react/packages/react-reconciler'),
			scheduler: path.posix.resolve('src/react/packages/scheduler'),
			shared: path.posix.resolve('src/react/packages/shared')
		}
	}
});
