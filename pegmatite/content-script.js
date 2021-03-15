/* global chrome */

function encode64(data) {
	for (var r = "", i = 0, n = data.length; i < n; i += 3) {
		r += append3bytes(
			data.charCodeAt(i),
			i + 1 !== n ? data.charCodeAt(i + 1) : 0,
			i + 2 !== n ? data.charCodeAt(i + 2) : 0);
	}
	return r;
}

function append3bytes(b1, b2, b3) {
	var c1 = b1 >> 2;
	var c2 = ((b1 & 0x3) << 4) | (b2 >> 4);
	var c3 = ((b2 & 0xF) << 2) | (b3 >> 6);
	var c4 = b3 & 0x3F;
	return encode6bit(c1 & 0x3F) +
		encode6bit(c2 & 0x3F) +
		encode6bit(c3 & 0x3F) +
		encode6bit(c4 & 0x3F);
}

function encode6bit(b) {
	if (b < 10) return String.fromCharCode(48 + b);
	b -= 10;
	if (b < 26) return String.fromCharCode(65 + b);
	b -= 26;
	if (b < 26) return String.fromCharCode(97 + b);
	b -= 26;
	if (b === 0) return "-";
	if (b === 1) return "_";
	return "?";
}

function compress(s) {
	s = unescape(encodeURIComponent(s));
	return encode64(window.RawDeflate.deflate(s));
}

function escapeHtml(text) {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

function getBackgroundColor(element, pseudoElt) {
	if (element !== null) {
		if (pseudoElt === undefined) pseudoElt = null;
		return window
			.getComputedStyle(element, pseudoElt)
			.getPropertyValue("background-color");
	}
	return "";
}

function CodePre(nodeList) {
	this.exist = false;
	this.list = nodeList;
	this.parentColor = "";
	this.selfColor = "";
	if (this.list.length > 0) {
		this.selfColor = getBackgroundColor(this.list.item(0));
		this.parentColor = getBackgroundColor(this.list.item(0).parentElement);
		this.exist = true;
	}
}

var codePre = new CodePre(document.querySelectorAll(".markdown-body pre, .code-block code")); // github style

function changeBackgroundColor(element, color, exist) {
	if (exist) {
		element.style.backgroundColor = color;
	}
}

function replaceElement(umlElem, imgElem) {
	var parent = umlElem.parentNode;
	if (parent !== null) { // for asciidoc (div div pre)
		parent.replaceChild(imgElem, umlElem);
		changeBackgroundColor(parent, codePre.parentColor, codePre.exist);

		imgElem.ondblclick = function() {
			parent.replaceChild(umlElem, imgElem);
			changeBackgroundColor(parent, codePre.selfColor, codePre.exist);
		};
		umlElem.ondblclick = function() {
			parent.replaceChild(imgElem, umlElem);
			changeBackgroundColor(parent, codePre.parentColor, codePre.exist);
		};
	}
}

function createImgElement(srcUrl) {
	var imgElem = document.createElement("img");
	imgElem.setAttribute("src", escapeHtml(srcUrl));
	imgElem.setAttribute("title", "");
	return imgElem;
}

var siteProfiles = {
	"default": {
		"selector": "pre[lang='uml'], pre[lang='puml'], pre[lang='plantuml']",
		"extract": function (elem) {
			return elem.querySelector("code").textContent.trim();
		},
		"replace": function (elem) {
			return elem;
		},
		"compress": function (elem) {
			return compress(elem.querySelector("code").textContent.trim());
		},
		"createImg": createImgElement
	},
	"gitpitch.com": {
		"selector": "pre code.lang-uml",
		"extract": function (elem) {
			return elem.innerText.trim();
		},
		"replace": function (elem) {
			return elem;
		},
		"compress": function (elem) {
			return compress(elem.innerText.trim());
		},
		"createImg": createImgElement
	},
	"gitlab.com": {
		"selector": "pre code span.line, div div pre", // markdown, asciidoc
		"extract": function (elem) {
			return elem.textContent.trim();
		},
		"replace": function (elem) {
			var child = elem.querySelector("code");
			if ( child !=null) return child; // markdown
			return elem; // asciidoc
		},
		"compress": function (elem) {
			var plantuml = "";
			if (elem.tagName == "SPAN"){ // markdown
				elem.parentNode.querySelectorAll("span.line").forEach(function(span){
					plantuml = plantuml + span.textContent.trim() + "\n";
				});
			} else { // asciidoc
				plantuml = elem.textContent.trim();
			}
			return compress(plantuml);
		},
		"waitFor": function (document) {
			return document.querySelector("i[aria-label='Loading content…']") === null;
		},
		"createImg": createImgElement
	},
	"bitbucket.org": {
		"selector": "div.codehilite.language-plantuml > pre",
		"extract": function (elem) {
			return elem.innerText.trim();
		},
		"replace": function(elem) {
			return elem;
		},
		"compress": function(elem) {
			return compress(elem.innerText.trim());
		},
		"waitFor": function (document) {
			return document.getElementsByClassName("language-plantuml").length > 0;
		},
		"createImg": createImgElement
	},
	"backlog.jp": {
		"selector": "pre.lang-uml, pre.lang-puml, pre.lang-plantuml",
		"extract": function (elem) {
			return elem.innerText.trim();
		},
		"createImg": createImgElement
	},
	"github.com": { // markdown + asciidoc
		"selector": "pre[lang='uml'], pre[lang='puml'], pre[lang='plantuml'], div div pre", // markdown, asciidoc
		"extract": function (elem) {
			var child = elem.querySelector("code");
			if (child != null) return child.textContent.trim(); // markdown
			return elem.textContent.trim(); // asciidoc
		},
		"replace": function (elem) {
			var child = elem.querySelector("code");
			if (child != null) return child; // markdown
			return elem; // asciidoc
		},
		"compress": function (elem) {
			var plantuml = "";
			var child = elem.querySelector("code");
			if (child != null) { // markdown
				plantuml = elem.querySelector("code").textContent.trim();
			} else { // asciidoc
				plantuml = elem.textContent.trim();
			}
			return compress(plantuml);
		},
		"createImg": createImgElement
	},
	"atlassian.net": {
		"selector": ".code-block code",
		"extract": function (elem) {
			var wholeCode = "";
			for (var index = 0; index < elem.childNodes.length; ++index) {
				var childNode = elem.childNodes.item(index);
				if (childNode.className && childNode.className.includes("linenumber")) {
					continue;
				}
				wholeCode += childNode.innerText || childNode.textContent;
			}
			return wholeCode.trim();
		},
		"replace": function (elem) {
			return elem.closest ? (elem.closest("span") || elem) : elem;
			// return elem;
		},
		"compress": function (elem) {
			return compress(siteProfiles["atlassian.net"].extract(elem));
		},
		"waitFor": function (document) {
			return document.querySelector("#addCommentButton") !== null;
		},
		"createImg": function (srcUrl) {
			var imgElem = createImgElement(srcUrl);
			imgElem.style.margin = "auto";
			imgElem.style.display = "block";
			imgElem.style.maxWidth = "100%";
			return imgElem;
		}
	},
};

function onLoadAction(siteProfile, baseUrl){
	[].forEach.call(document.querySelectorAll(siteProfile.selector), function (umlElem) {
		var plantuml = siteProfile.extract(umlElem);
		if (plantuml.substr(0, "@start".length) !== "@start") return;
		var plantUmlServerUrl = baseUrl + siteProfile.compress(umlElem);
		var replaceElem = siteProfile.replace(umlElem);
		if (plantUmlServerUrl.lastIndexOf("https", 0) === 0) { // if URL starts with "https"
			replaceElement(replaceElem, siteProfile.createImg(plantUmlServerUrl));
		} else {
			// to avoid mixed-content
			chrome.runtime.sendMessage({ "action": "plantuml", "url": plantUmlServerUrl }, function(dataUri) {
				replaceElement(replaceElem, siteProfile.createImg(dataUri));
			});
		}
	});
}

function run(config) {
	var hostname = window.location.hostname.split(".").slice(-2).join(".");
	var siteProfile = siteProfiles[hostname] || siteProfiles["default"];
	var baseUrl = config.baseUrl || "https://www.plantuml.com/plantuml/img/";

	if (siteProfile.waitFor) {
		var observer = new MutationObserver(function() {
			if (siteProfile.waitFor(document)) {
				onLoadAction(siteProfile, baseUrl);
				observer.disconnect();
			}
		});

		observer.observe(document.body, {
			attributes: true,
			characterData: true,
			childList: true,
			subtree: true
		});
	} else {
		onLoadAction(siteProfile, baseUrl);
	}
}

chrome.storage.local.get("baseUrl", function(config) {
	run(config);
});
