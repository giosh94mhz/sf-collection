/*
 * sf-collection - v0.1.5
 * jQuery plugin to handle symfony2 collection in a proper way
 * 
 *
 * Copyright (C) 2015  Giorgio Premi
 * Licensed under MIT License
 * See LICENSE file for the full copyright notice.
 */
;(function ( $, window, document, undefined ) {
    "use strict";

    var pluginName = "sfcollection";
    var defaults = {
        collectionName: null,
        prototype: null,
        prototypeName: "__name__",

        allowAdd: true,
        allowRemove: true,

        // hooks
        initAddButton: defaultInitAddButton,
        initRemoveButton: defaultInitRemoveButton,
        entrySelector: '> div',
        entryNameGenerator: defaultEntryNameGenerator,

        // Events
        create: null,
        add: null,
        remove: null,
    };

    function SfCollection(element, options) {
        this.element = $(element);
        this.options = $.extend({}, defaults, this.element.data(), options);
        this._defaults = defaults;
        this._name = pluginName;
        this.widgetEventPrefix = pluginName;

        this.entries = $();
        this.entryNames = [];

        this.onRemoveAll = false;
        this.lastEntry = null;

        this.init();
    }

    $.extend(SfCollection.prototype, {
        init: function () {
            var self = this;
            var options = this.options;

            options.collectionName = options.collectionName || '';
            if (!this.options.collectionName.length) {
                console.error("jquery.sf-collection.js: collectionName is required to correctly ");
                return;
            }

            this.element.addClass('sf-collection');

            this.element.find(this.options.entrySelector).each(function(i, entry) {
                entry = $(entry);
                var entryName = findEntryName(entry, options.collectionName);
                if (!entryName) {
                    return;
                }
                self._initEntryNode.call(self, entry, entryName);
                self.lastEntry = entry;
            });

            if (options.allowAdd) {
                var $add = options.initAddButton(this.element);
                if ($add !== false) {
                    if (!isNonEmptyObject($add)) {
                        console.error("jquery.sf-collection.js: initAddButton must return a non-empty jQuery object or false");
                        return false;
                    }
                    $add.addClass('sf-collection-action sf-collection-add');
                }
            }


            if (options.allowRemove) {
                var $remove = options.initRemoveButton(this.element);
                if (false !== $remove) {
                    if (!isNonEmptyObject($remove)) {
                        console.error("jquery.sf-collection.js: initRemoveButton must return a non-empty jQuery object or false");
                        return false;
                    }
                    $remove.addClass('sf-collection-action sf-collection-remove');
                }
            }

            this.element.on('click', '.sf-collection-action', function(event) { self._dispatchClickEvent.call(self, event); });

            this._trigger("create", null, {
                collection: this.element,
                entries: this.entries,
                entryNames: this.entryNames,
            });
        },
        _initEntryNode: function (entry, entryName) {
            var options = this.options;

            if (this.entryNames.indexOf(entryName) >= 0) {
                console.warn("jquery.sf-collection.js: duplicated entry name");
            }

            this.entries = this.entries.add(entry);
            this.entryNames.push(entryName);
            entry.addClass('sf-collection-entry').data('entry-name', entryName);

            if (options.allowAdd) {
                var $add = options.initAddButton(this.element, entry);
                if (false !== $add) {
                    if (!isNonEmptyObject($add)) {
                        console.error("jquery.sf-collection.js: initAddButton must return a non-empty jQuery object or false");
                        return false;
                    }
                    $add.addClass('sf-collection-action sf-collection-add');
                }
            }

            if (options.allowRemove) {
                var $remove = options.initRemoveButton(this.element, entry);
                if (false !== $remove) {
                    if (!isNonEmptyObject($remove)) {
                        console.error("jquery.sf-collection.js: initRemoveButton must return a non-empty jQuery object or false");
                        return false;
                    }
                    $remove.addClass('sf-collection-action sf-collection-remove');
                }
            }
        },
        _dispatchClickEvent: function (event) {
            var action = $(event.currentTarget);
            var entry = $(event.target).closest('.sf-collection, .sf-collection-entry');
            if (entry.is('.sf-collection')) {
                entry = null;
            }

            if (action.is('.sf-collection-add')) {
                this._addEntryNode(entry, event);
            } else if (action.is('.sf-collection-remove')) {
                if (null !== entry) {
                    this._removeEntryNode(entry, event);
                } else {
                    this._removeAll(event);
                }
            } else {
                return;
            }

            event.stopPropagation();
            event.preventDefault();
        },
        _addEntryNode: function (afterEntry, originalEvent) {
            var entryName = this.options.entryNameGenerator(this.element, this.entryNames);

            afterEntry = afterEntry || this.lastEntry;

            var regExp = new RegExp(escapeRegExp(this.options.prototypeName), 'g');

            var prototype = this.options.prototype.replace(regExp, entryName);
            var entry = $($.trim(prototype));

            this._initEntryNode(entry, entryName);

            if (afterEntry) {
                entry.insertAfter(afterEntry);
            } else {
                entry.prependTo(this.element);
            }

            var newLast = this.lastEntry ?
                    this.lastEntry.nextAll('.sf-collection-entry').last()
                    : this.element.children('.sf-collection-entry').last();

            if (newLast.length) {
                this.lastEntry = newLast;
            }

            this._trigger("add", originalEvent, {
                collection: this.element,
                entries: this.entries,
                entry: entry,
                entryName: entryName,
            });
        },
        _removeAll: function (originalEvent) {
            var self = this;
            this.onRemoveAll = true;
            while (this.entries.length) {
                self._removeEntryNode.call(self, this.entries.eq(0), originalEvent);
            }
            this.onRemoveAll = false;
        },
        _removeEntryNode: function (entry, originalEvent) {
            var entryName = entry.data('entry-name');

            if (this.lastEntry.is(entry)) {
                this.lastEntry = this.lastEntry.prev('.sf-collection-entry');
                if (!this.lastEntry.length) {
                    this.lastEntry = null;
                }
            }

            var index = this.entryNames.indexOf(entryName);
            if (index !== -1) {
                this.entryNames.splice(index, 1);
            }

            this.entries = this.entries.not(entry);
            entry.remove();

            this._trigger("remove", originalEvent, {
                collection: this.element,
                entries: this.entries,
                entryNames: this.entryNames,
                entry: entry,
                entryName: entryName,
                removeAll: this.onRemoveAll
            });
        },
        // copy-pasted from jQueryUI widget
        _trigger: function( type, event, data ) {
            var prop, orig,
                callback = this.options[ type ];

            data = data || {};
            event = $.Event( event );
            event.type = ( type === this.widgetEventPrefix ?
                type :
                this.widgetEventPrefix + type ).toLowerCase();
            // the original event may come from any element
            // so we need to reset the target on the new event
            event.target = this.element[ 0 ];

            // copy original event properties over to the new event
            orig = event.originalEvent;
            if ( orig ) {
                for ( prop in orig ) {
                    if ( !( prop in event ) ) {
                        event[ prop ] = orig[ prop ];
                    }
                }
            }

            this.element.trigger( event, data );
            return !( $.isFunction( callback ) &&
                callback.apply( this.element[ 0 ], [ event ].concat( data ) ) === false ||
                event.isDefaultPrevented() );
        }
    });

    /*
     * Plugin wrapper
     */
    $.fn[pluginName] = function (options) {
        return this.each(function() {
            var plugin = $.data(this, "plugin-" + pluginName);
            if (!plugin) {
                plugin = $.data(this, "plugin-" + pluginName, new SfCollection(this, options));
            }
        });
    };

    /*
     * private functions
     */
    function escapeRegExp(string) {
        return string.replace(/([.*+?^${}()|\[\]\/\\])/g, "\\$1");
    }
    
    function isNonEmptyObject($object) {
        return typeof $object === "object" && null !== $object && $object.length > 0;
    }

    function findEntryName(entry, collectionName) {
        var anInput = entry.find(':input[name^="' + collectionName + '["]').eq(0);
        var fullName = '' + anInput.attr('name');

        var regExp = new RegExp('^' + escapeRegExp(collectionName) + '\\[([a-z0-9]+)\\].*$');

        var matches = fullName.match(regExp);
        if (!matches) {
            return null;
        }

        return matches[1];
    }

    function defaultInitRemoveButton(collection, entry) {
        if (!entry) {
            return false;
        }

        var prototype = collection.data('prototype-remove') || '<a href="#remove">[-]</a>';
        var $remove = $($.trim(prototype));
        if ($remove.length > 1) {
            console.warn("jquery.sf-collection.js: button should be a single DOM node. Wrapping everything in a div...");
            $remove = $('<div>').append($remove);
        }
        return $remove.appendTo(entry);
    }

    function defaultInitAddButton(collection, entry) {
        if (entry) {
            return false;
        }

        var prototype = collection.data('prototype-add') || '<a href="#add">[+]</a>';
        var $add = $($.trim(prototype));
        if ($add.length > 1) {
            console.warn("jquery.sf-collection.js: button should be a single DOM node. Wrapping everything in a div...");
            $add = $('<div>').append($add);
        }
        return $add.appendTo(entry ? entry : collection);
    }

    function defaultEntryNameGenerator(collection, entryNames) {
        var max = collection.data('sf-collection-max-entry') || Math.max.apply(null, entryNames.concat(0));

        if (isNaN(max) || !isFinite(max)) {
            console.error("jquery.sf-collection.js: cannot calculate a maximum. Define a custom entry name generator.");
            return null;
        }

        collection.data('sf-collection-max-entry', ++ max);

        return max;
    }

})( jQuery, window, document );
