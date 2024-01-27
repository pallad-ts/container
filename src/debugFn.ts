import deb = require("debug");

export function debugFn(suffix?: string): deb.Debugger {
	return deb("@pallad/container" + (suffix ? `:${suffix}` : ""));
}
