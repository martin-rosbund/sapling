/**
 * Represents CPU information.
 */
export interface Cpu {
	manufacturer: string;
	brand: string;
	vendor: string;
	family: string;
	model: string;
	stepping: string;
	revision: string;
	voltage: string;
	speed: number;
	speedMin: number;
	speedMax: number;
	governor: string;
	cores: number;
	physicalCores: number;
	performanceCores?: number;
	efficiencyCores?: number;
	processors: number;
	socket: string;
	flags: string;
	virtualization: boolean;
}

/**
 * Represents CPU speed/load information.
 */
export interface CpuSpeed {
	currentLoad: number;
	currentLoadUser: number;
	currentLoadSystem: number;
}

/**
 * Represents filesystem information.
 */
export interface Filesystem {
	fs: string;
	type: string;
	size: number;
	used: number;
	available: number;
	use: number;
}

/**
 * Represents memory information.
 */
export interface Memory {
	total: number;
	free: number;
	used: number;
	active: number;
	available: number;
}

/**
 * Represents a network interface.
 */
export interface NetworkInterface {
	iface: string;
	operstate: string;
	rx_bytes: number;
	rx_dropped: number;
	rx_errors: number;
	tx_bytes: number;
	tx_dropped: number;
	tx_errors: number;
	rx_sec: number;
	tx_sec: number;
	ms: number;
}

/**
 * Represents operating system information.
 */
export interface OperatingSystem {
	platform: string;
	distro: string;
	release: string;
	kernel: string;
	codename: string;
	arch: string;
	hostname: string;
	fqdn: string;
	codepage: string;
	logofile: string;
}

/**
 * Represents application state.
 */
export interface ApplicationState {
	isReady: boolean;
}

/**
 * Represents time information.
 */
export interface Time {
	current: string | number;
	uptime: string | number;
	timezone: string;
	timezoneName: string;
}

/**
 * Represents application version.
 */
export interface ApplicationVersion {
	version: string;
}
