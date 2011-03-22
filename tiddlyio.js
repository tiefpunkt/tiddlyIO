/*
*	TiddlyIO.js v0.1
*   JavaScript Library to access files on your local harddrive
*
*	Copyright (c) 2011 Severin Schols
*   Licensed under the MIT license. See LICENSE.markdown for details.
*/

function TiddlyIO() {
	var userAgent = navigator.userAgent.toLowerCase();
	this.isIE = userAgent.indexOf("msie") != -1 && userAgent.indexOf("opera") == -1;
	this.documentPath = document.location.toString();
	this.localPath = this.getLocalPath(this.documentPath);
	return this;
}

TiddlyIO.prototype.documentPath = '';
TiddlyIO.prototype.localPath = '';

TiddlyIO.prototype.copyFile = function (dest, source) {
	return this.isIE ? this.ieCopyFile(dest, source) : false;
};

TiddlyIO.prototype.saveFile = function (fileUrl, content) {
	var r = this.mozillaSaveFile(fileUrl, content);
	if (!r)
		r = this.ieSaveFile(fileUrl, content);
	if (!r)
		r = this.javaSaveFile(fileUrl, content);
	return r;
};

TiddlyIO.prototype.loadFile = function (fileUrl) {
	var r = this.mozillaLoadFile(fileUrl);
	if ((r === null) || (r === false))
		r = this.ieLoadFile(fileUrl);
	if ((r === null) || (r === false))
		r = this.javaLoadFile(fileUrl);
	return r;
};

TiddlyIO.prototype.ieCreatePath = function (path) {
	var fso;
	try {
		fso = new ActiveXObject("Scripting.FileSystemObject");
	} catch (ex) {
		return null;
	}

	var pos = path.lastIndexOf("\\");
	if (pos == -1)
		pos = path.lastIndexOf("/");
	if (pos != -1)
		path = path.substring(0, pos + 1);

	var scan = [path];
	var parent = fso.GetParentFolderName(path);
	while (parent && !fso.FolderExists(parent)) {
		scan.push(parent);
		parent = fso.GetParentFolderName(parent);
	}
	
	var i;
	for (i = scan.length - 1; i >= 0; i--) {
		if(!fso.FolderExists(scan[i])) {
			fso.CreateFolder(scan[i]);
		}
	}
	return true;
};

// Returns null if it can't do it, false if there's an error, true if it saved OK
TiddlyIO.prototype.ieSaveFile = function (filePath,content){
	this.ieCreatePath(filePath);
	var fso;
	try {
		fso = new ActiveXObject("Scripting.FileSystemObject");
	} catch(ex) {
		return null;
	}
	var file = fso.OpenTextFile(filePath, 2, -1, 0);
	file.Write(content);
	file.Close();
	return true;
};

// Returns null if it can't do it, false if there's an error, or a string of the content if successful
TiddlyIO.prototype.ieLoadFile = function (filePath) {
	var fso, content;
	try {
		fso = new ActiveXObject("Scripting.FileSystemObject");
		var file = fso.OpenTextFile(filePath, 1);
		content = file.ReadAll();
		file.Close();
	} catch (ex) {
		return null;
	}
	return content;
};

TiddlyIO.prototype.ieCopyFile = function (dest, source) {
	this.ieCreatePath(dest);
	try {
		var fso = new ActiveXObject("Scripting.FileSystemObject");
		fso.GetFile(source).Copy(dest);
	} catch (ex) {
		return false;
	}
	return true;
};

// Returns null if it can't do it, false if there's an error, true if it saved OK
TiddlyIO.prototype.mozillaSaveFile = function (filePath, content) {
	if (window.Components) {
		try {
			netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect");
			var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
			file.initWithPath(filePath);
			if(!file.exists())
				file.create(0, 0664);
			var out = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance(Components.interfaces.nsIFileOutputStream);
			out.init(file, 0x20 | 0x02, 00004, null);
			out.write(content, content.length);
			out.flush();
			out.close();
			return true;
		} catch (ex) {
			return false;
		}
	}
	return null;
};

// Returns null if it can't do it, false if there's an error, or a string of the content if successful
TiddlyIO.prototype.mozillaLoadFile = function (filePath) {
	if (window.Components) {
		try {
			netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect");
			var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
			file.initWithPath(filePath);
			if (!file.exists())
				return null;
			var inputStream = Components.classes["@mozilla.org/network/file-input-stream;1"].createInstance(Components.interfaces.nsIFileInputStream);
			inputStream.init(file, 0x01, 00004, null);
			var sInputStream = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance(Components.interfaces.nsIScriptableInputStream);
			sInputStream.init(inputStream);
			var contents = sInputStream.read(sInputStream.available());
			sInputStream.close();
			inputStream.close();
			return contents;
		} catch (ex) {
			return false;
		}
	}
	return null;
};

TiddlyIO.prototype.javaUrlToFilename = function (url) {
	var f = "//localhost";
	if (url.indexOf(f) === 0)
		return url.substring(f.length);
	var i = url.indexOf(":");
	return i > 0 ? url.substring(i - 1) : url;
}; 

TiddlyIO.prototype.javaSaveFile = function (filePath, content) {
	try {
		if (document.applets["TiddlySaver"])
			return document.applets["TiddlySaver"].saveFile(this.javaUrlToFilename(filePath), "UTF-8", content);
	} catch (ex) {
	}
	try {
		var s = new java.io.PrintStream(new java.io.FileOutputStream(this.javaUrlToFilename(filePath)));
		s.print(content);
		s.close();
	} catch (ex) {
		return null;
	}
	return true;
};

TiddlyIO.prototype.javaLoadFile = function (filePath) {
	try {
		if (document.applets["TiddlySaver"])
			return String(document.applets["TiddlySaver"].loadFile(this.javaUrlToFilename(filePath), "UTF-8"));
	} catch (ex) {
	}
	var content = [];
	try {
		var r = new java.io.BufferedReader(new java.io.FileReader(this.javaUrlToFilename(filePath)));
		var line;
		while ((line = r.readLine()) !== null)
			content.push(new String(line));
		r.close();
	} catch (ex) {
		return null;
	}
	return content.join("\n");
};

TiddlyIO.prototype.getLocalPath = function (origPath) {
	var originalPath = this.convertUriToUTF8(origPath, "UTF-8");
	// Remove any location or query part of the URL
	var argPos = originalPath.indexOf("?");
	if (argPos != -1)
		originalPath = originalPath.substr(0, argPos);
	var hashPos = originalPath.indexOf("#");
	if (hashPos != -1)
		originalPath = originalPath.substr(0, hashPos);
	// Convert file://localhost/ to file:///
	if(originalPath.indexOf("file://localhost/") === 0)
		originalPath = "file://" + originalPath.substr(16);
	// Convert to a native file format
	var localPath;
	if (originalPath.charAt(9) == ":") { // pc local file
		localPath = unescape(originalPath.substr(8)).replace(new RegExp("/", "g"), "\\");
		this.separator = "\\";
	} else if (originalPath.indexOf("file://///") === 0) { // FireFox pc network file
		localPath = "\\\\" + unescape(originalPath.substr(10)).replace(new RegExp("/", "g"), "\\");
		this.separator = "\\";
	} else if (originalPath.indexOf("file:///") === 0) { // mac/unix local file
		localPath = unescape(originalPath.substr(7));
		this.separator = "/";
	} else if (originalPath.indexOf("file:/") === 0) { // mac/unix local file
		localPath = unescape(originalPath.substr(5));
		this.separator = "/";
	} else { // pc network file
		localPath = "\\\\" + unescape(originalPath.substr(7)).replace(new RegExp("/", "g"), "\\");
		this.separator = "\\";
	}

	return localPath;
};

TiddlyIO.prototype.convertUriToUTF8 = function (uri, charSet) {
	if (window.netscape === undefined || charSet === undefined || charSet === "")
		return uri;
	var converter;
	try {
		netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect");
		converter = Components.classes["@mozilla.org/intl/utf8converterservice;1"].getService(Components.interfaces.nsIUTF8ConverterService);
	} catch (ex) {
		return uri;
	}
	return converter.convertURISpecToUTF8(uri, charSet);
};
