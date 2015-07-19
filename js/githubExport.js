var issueMigration = {
    params: {},
    issues: [],

    trBoardId: '',
    trListId: '',

    completed: 0,
    failed: 0,

    go: function() {
        // setup
        this.getParams();
        this.getBoardId();
        this.getListId();

        // migrate
        this.getGithubIssues();
        this.uploadToTrello();
    },

    // --------------------------
    // Setup functions
    // --------------------------

    // Get form parameters.
    getParams: function() {
        // Get parameters from the web form.
        var arr = $('form').serializeArray();
        
        for (var i=0; i<arr.length; i++) {
            var key = arr[i].name;
            var val = arr[i].value;
            this.params[key] = val;
        }
    },

    // Get Trello board ID.
    getBoardId: function() {
        var baseUrl = 'https://trello.com/1/members/me/boards?fields=name';
        var boards = [];

        $.ajax({
            url: baseUrl + '&key=' + this.params.trAppkey + '&token=' + this.params.trToken,
            async: false,
            success: function(data) {
                boards = data;
            }
        });

        for (var i=0; i<boards.length; i++) {
            if (boards[i].name == this.params.trBoard) {
                this.trBoardId = boards[i].id;
            }
        }
    },

    // Get Trello list ID.
    getListId: function() {
        var baseUrl = 'https://api.trello.com/1/board/' + this.trBoardId;
        var lists = [];

        $.ajax({
            url: baseUrl + '?key=' + this.params.trAppkey + '&token=' + this.params.trToken + '&lists=open',
            async: false,
            success: function(data) {
                lists = data.lists;
            }
        });

        for (var i=0; i<lists.length; i++) {
            if (lists[i].name == this.params.trList) {
                this.trListId = lists[i].id;
            }
        }
    },

    // --------------------------
    // GitHub functions
    // --------------------------

    // Make call to get GitHub issues.
    getGithubIssues: function() {
        var baseUrl = 'https://api.github.com/repos/' + this.params.ghUser + '/' + this.params.ghRepo;
        var api = '/issues';
        
        var _this = this;
        var issues = [];

        $.ajax({
            url: baseUrl + api + '?access_token=' + this.params.ghToken,
            async: false,
            success: function(data, status, xhr) {
                _this.parseGithubIssues(data);
            }
        });
    },

    // Clean up GitHub issues and put them into a sanitized object.
    parseGithubIssues: function(data) {
        for (var i=0; i<data.length; i++) {
            var obj = {
                assignee: data[i].assignee.login,
                body: data[i].body,
                title: data[i].title
            };

            obj.comments = this.getGithubComments(data[i].comments_url);

            this.issues.push(obj);
        }
    },

    // Get list of comments for a Github issue.
    getGithubComments: function(url) {
        var comments = [];

        $.ajax({
            url: url + '?access_token=' + this.params.ghToken,
            async: false,

            success: function(data, status, xhr) {
                for (var i=0; i<data.length; i++) {
                    comments.push(data[i].body);
                }
            }
        });

        return comments;
    },

    // --------------------------
    // Trello  functions
    // --------------------------

    uploadToTrello: function() {
        var baseUrl = 'https://trello.com/1/cards';

        for (var i=0; i<this.issues.length; i++) {
            // Upload new ticket.
            var success = false;
            var cardId;

            var data = {
                key: this.params.trAppkey,
                token: this.params.trToken,
                idList: this.trListId,
                name: this.issues[i].title,
                desc: this.issues[i].body
            };

            $.ajax({
                method: 'POST',
                url: baseUrl,
                async: false,
                data: data,
                dataType: 'json',

                success: function(data) {
                    success = true;
                    cardId = data.id;
                }
            });

            // Log success or failure.
            if (success) {
                this.completed++;
            } else {
                this.failed++
            }

            // Add comments to new ticket.
            for (var j=0; j<this.issues[i].comments.length; j++) {
                var data = {
                    key: this.params.trAppkey,
                    token: this.params.trToken,
                    text: this.issues[i].comments[j]
                };

                $.ajax({
                    method: 'POST',
                    url: baseUrl + '/' + cardId + '/actions/comments',
                    aysnc: false,
                    data: data,
                    dataType: 'json'
                });
            }
        }

        alert(this.completed + ' new tickets were created in Trello. \n' + this.failed + ' tickets were not migrated.');
    }
}