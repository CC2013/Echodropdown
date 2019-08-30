(function(root, factory) {
  factory(root.jQuery);
}(this, function($) {
  'use strict';

  var Echodropdown = function(element, options) {
    this.$element = $(element);
    this.query = '';  // input框内容过滤
    this.options = $.extend({}, Echodropdown.defaults, options);
    this.source = this.options.source;
    this.shown = false;
    this.search = this.options.search;  // 是否顯示搜索框
    this.renderedSearch = false;
    this.theme = this.options.theme || Echodropdown.defaults.theme;
    this.$showDiv = $(this.theme.showDiv);
    this.$div = $(this.theme.div);
    this.$menu = $(this.theme.menu);
    this.$item = $(this.theme.item);
    this.$search = $(this.theme.search);
    // 選中執行回調函數
    this.afterSelect = this.options.afterSelect;
    this.preRender();
    this.listen();
  };

  Echodropdown.prototype = {
    constructor: Echodropdown,
    //數據來源
    setSource: function(source) {
      this.setSource = source;
    },
    show: function() {
      // position 返回當前元素距離頂部已經左側距離{left:xxx, top:xxx}
      var pos = $.extend({}, this.$element.position(), {
        height: this.$element.offsetHeight
      });

      var $ele = $('<ul class="dropdown-menu"></ul>');
      $ele.css('position', 'fixed');
      var offset = this.$element.offset();
      pos.top = offset.top;
      pos.left = offset.left;

      $ele.css({top: pos.top, left: pos.left});

      // 暫時下拉寬度保持和父元素一致
      $ele.css('width', this.$element.outerWidth() + 'px');
      
      this.$div.toggle();
      this.shown = true
      return this;
    },
    hide: function() {
      this.$div.hide();
      this.shown = false;
      return this;
    },
    lookup: function(query) {
      if( typeof query !== 'undefined' && query !== null) {
        this.query = query; // 此处定义this.query，搜索内容
      } else {
        this.query = this.$search.find('input').val();
      }

      if($.isFunction(this.source) && this.source.length === 3) {
        this.source(this.query, $.proxy(this.process, this), $.proxy(this.process, this));
      } else if($.isFunction(this.source)) {
        this.source(this.query, $.proxy(this.process, this))
      } else if(this.source) {
        this.process(this.source);
      }
    },
    process: function(items) {
      // 有必要的话渲染前进行处理
      var data;
      var self = this;
      if (self.query) {
        data = items.filter(function(item) {
          return item.indexOf(self.query) > -1;
        });
      } else {
        data = items;
      }
      this.render(data);
    },
    render: function(items) {
      var self = this;
      // 渲染html
      var data = [];
      data = $(items).map(function(i, item) {
        var text = self.displayText(item);
        i = $(self.theme.item).data('value', item);  // $(self.theme.item)不能使用self.$item代替，否则会出现引用更改原有值的情况
        i.find(self.theme.itemContentSelector)
          .addBack(self.theme.itemContentSelector)
          .html(text);
        i.find('a').attr('title', text);
        if(text === self.$element.find('.content').text()) {
          i.addClass('active');
          self.$element.data('active', item);
        }
        return i[0];
      });
      this.$menu.html(data);
      if(this.search && !this.renderedSearch) {
        this.renderSearch();
      }
      this.$div.append(this.$menu);
      this.$element.append(this.$div);
      this.$search.find('input').focus();
      return this;
    },
    preRender: function() {
      this.$element.html(this.$showDiv);
      this.render(this.source);
      this.hide();
      return this;
    },
    renderSearch: function() {
      this.$div.html(this.$search);
      this.renderedSearch = true;
      return this;
    },
    displayText: function(item) {
      return typeof item !== 'undefined' && typeof item.name !== 'undefined' ? item.name : item;
    },
    select: function() {
      // 获取active的value值
      var val = this.$menu.find('li.active').data('value');
      // 选中后展示该值
      this.$element.find('.text > .content').text(val);
      // 选中后执行afterSelect事件
      this.afterSelect(val);
      return this.hide();
    },
    listen: function() {
      // text需要click或者hover事件
      this.$element
        .on('click', '.text', $.proxy(this.click, this))
        .on('keypress', $.proxy(this.keypress, this))
        .on('mouseenter', $.proxy(this.mouseenter, this))
        .on('mouseleave', $.proxy(this.mouseleave, this));
      
      if(this.eventSupported('keydown')) {
        this.$element.on('keydown', $.proxy(this.keydown, this));
      }

      // if search is true, then need input需要keyup事件，keypress事件，input事件
      // if(this.search) {
        this.$search
          .on('focus', $.proxy(this.searchInputFocus, this))
          .on('blur', $.proxy(this.searchInputBlur, this))
          // .on('keypress', $.proxy(this.searchInputKeypress, this))
          .on('propertychange input', $.proxy(this.searchInputInput, this))
          .on('keyup', $.proxy(this.searchInputKeyup, this));
      // }

      // li選項事件
      var itemTagName= this.$item.prop('tagName');
      this.$menu.on('click', itemTagName, $.proxy(this.click, this));
      this.$menu.on('mouseenter', itemTagName, $.proxy(this.divMouseenter, this));

      this.$div.on('mouseleave', $.proxy(this.divMouseleave, this));
    },
    destroy: function() {
      this.$element.data('echodropdown', null);
      this.$element.data('active', null);
      this.$element.unbind('click')
                    .unbind('keypress')
                    .unbind('mouseenter')
                    .unbind('mouseleave');
      if(this.eventSupported('keydown')) {
        this.$element.unbind('keydown');
      }

      this.$menu.remove();
      this.destroyed = true;
    },
    eventSupported : function(eventName) {
      var isSupported = eventName in this.$element;
      if(!isSupported) {
        this.$element.setAttribute(eventName, 'return;');
        isSupported = typeof this.$element[eventName] === 'function';
      }
      return isSupported;
    },
    mouseenter: function(e) {
      !this.shown && this.show();
    },
    mouseleave: function(e) {
      this.shown && this.hide();
    },
    click: function(e) {
      e.preventDefault();
      var $currentTarget = $(e.currentTarget);
      if($currentTarget.hasClass('text')) {
        this.shown ? this.hide() : this.show();
      }
      if($currentTarget.hasClass('dropdown-menu-item')) {
        this.select();
      }
      this.clearSearchInput();
    },
    keypress: function(e) {
      this.move(e);
    },
    keydown: function(e) {
      if(e.keyCode === 17) { // ctrl
        return;
      }
      // this.supressKeyPressRepeat = ~$.inArray(e.keCode, [40, 38, 9, 13, 27]);
      if(!this.shown && e.keyCode === 40) {
        this.lookup();
      } else {
        this.move();
      }
    },
    searchInputFocus: function(e) {

    },
    searchInputBlur: function(e) {

    },
    searchInputKeypress: function(e) {
      this.move();
    },
    searchInputInput: function(e) {

    },
    searchInputKeyup: function(e) {
      var currentVal = this.$search.find('input').val();
      this.query = currentVal;
      this.lookup();
    },
    divMouseenter: function(e) {
      // 设定当前li为active
      this.$menu.find('.active').removeClass('active');
      $(e.currentTarget).addClass('active');
    },
    divMouseleave: function(e) {
      this.clearSearchInput();
    },
    clearSearchInput: function() {
      if(!this.shown) {
        this.$search.find('input').val('')
        this.lookup();
      }
    },
    updater: function(item) {
      return item;
    },
    next: function() {
      var active = this.$menu.find('.active').removeClass('active');
      var next = active.next();
      if(!next.length) {
        next = $(this.$menu.find($(this.theme.item).prop('tagName'))[0]);
      }
      next.addClass('active');
      //更新text值
      var newVal = this.updater(next.data('value'));
      this.$element.find('.content').text(this.displayText(newVal));
    },
    prev: function() {
      var active = this.$menu.find('.active').removeClass('active');
      var prev = active.prev();
      if(!prev.length) {
        prev = this.$menu.find($(this.theme.item).prop('tagName')).last();
      }
      prev.addClass('active');
      // 更新text值
      var newVal = this.updater(next.data('value'));
      this.$element.find('.content').text(this.displayText(newVal));
    },
    move: function(e) {
      if(!this.shown) {
        return;
      }
      switch(e.keyCode) {
        case 9:  // tab
        case 13:  // enter
        case 27:  // escape
          e.preventDefault();
          break;
        case 38:  // up arrow
          if(e.shiftKey) {  // 组合键做其他用处
            return ;
          }
          e.preventDefault();
          this.prev();
          break;
        case 40:  // down arrow
          if(e.shiftKey) {
            return;
          }
          e.preventDefault();
          this.next();
          break;
      }
    }
  }

  var old = $.fn.echodropdown;

  $.fn.echodropdown = function(option) {
    var arg = arguments;
    return this.each(function() {
      var $this = $(this);
      var data = $this.data('echodropdown');
      var options = typeof option == 'object' && option;
      !data && $this.data('echodropdown', (data = new Echodropdown(this, options)));
    });
  };

  Echodropdown.defaults = {
    source: [],
    items: 8,
    afterSelect: $.noop,
    search: false,
    theme: {
      showDiv: '<div class="text"><span class="content">请选择</span><span class="arrow"></span></div>',
      div: '<div class="select-box"></div>',
      search: '<div class="search-item"><span class="search-img"></span><input class="search" placeholder="请输入关键字搜索"></div>',
      menu: '<ul class="dropdown-menu"></ul>',
      item: '<li class="dropdown-menu-item"><a href="javascript:void(0)"></a></li>',
      itemContentSelector: 'a'
    }
  };

  $.fn.echodropdown.Constructor = Echodropdown;

  $.fn.echodropdown.noConflict = function() {
    $.fn.echodropdown = old;
    return this;
  };

}));
