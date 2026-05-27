const Task = require('../models/Task');

// @desc    Get all tasks
// @route   GET /api/tasks
// @access  Private
const getTasks = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'admin') {
      // Admin sees everything
      tasks = await Task.find()
        .populate('createdBy', 'username email role')
        .populate('assignedTo', 'username email role')
        .populate('comments.user', 'username role')
        .sort({ createdAt: -1 });
    } else {
      // Employee sees tasks assigned to them or created by them
      tasks = await Task.find({
        $or: [
          { createdBy: req.user._id },
          { assignedTo: req.user._id }
        ]
      })
      .populate('createdBy', 'username email role')
      .populate('assignedTo', 'username email role')
      .populate('comments.user', 'username role')
      .sort({ createdAt: -1 });
    }
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const createTask = async (req, res) => {
  try {
    const { title, description, priority, status, assignedTo, dueAt, reminderAt } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    const taskData = {
      title,
      description,
      priority: priority || 'medium',
      status: status || 'Pending',
      createdBy: req.user._id,
      assignedTo: assignedTo || null,
      dueAt,
      reminderAt,
      history: [{
        action: 'Created',
        user: req.user._id,
        details: `Task created by ${req.user.username}`
      }]
    };

    const task = await Task.create(taskData);

    const populatedTask = await Task.findById(task._id)
      .populate('createdBy', 'username email role')
      .populate('assignedTo', 'username email role');

    res.status(201).json(populatedTask);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const isAdmin = req.user.role === 'admin';
    const isCreator = task.createdBy.toString() === req.user._id.toString();
    const isAssignee = task.assignedTo && task.assignedTo.toString() === req.user._id.toString();

    if (!isAdmin && !isCreator && !isAssignee) {
      return res.status(403).json({ message: 'Not authorized to update this task' });
    }

    const updates = { ...req.body };
    const historyEntry = {
      user: req.user._id,
      timestamp: new Date()
    };

    // Handle Status Changes & Reassignment Logic
    if (updates.status && updates.status !== task.status) {
      historyEntry.action = 'Status Changed';
      historyEntry.details = `Status changed from ${task.status} to ${updates.status}`;
      
      // Step 4 logic: Clarification needed
      if (updates.status === 'Sent Back' && !isAdmin) {
        updates.isReassignedToAdmin = true;
        historyEntry.details += ' (Reassigned to Admin for clarification)';
      }
      
      // Admin response logic
      if (isAdmin && task.isReassignedToAdmin) {
        updates.isReassignedToAdmin = false;
        historyEntry.details += ' (Admin provided clarification, reassigned back to employee)';
      }
    }

    // Handle Comments
    if (updates.comment) {
      task.comments.push({
        user: req.user._id,
        text: updates.comment
      });
      delete updates.comment;
      
      if (!historyEntry.action) {
        historyEntry.action = 'Comment Added';
        historyEntry.details = 'New comment added to task';
      }
    }

    if (historyEntry.action) {
      task.history.push(historyEntry);
    }

    // Apply updates
    Object.keys(updates).forEach(key => {
      task[key] = updates[key];
    });

    await task.save();

    const updatedTask = await Task.findById(task._id)
      .populate('createdBy', 'username email role')
      .populate('assignedTo', 'username email role')
      .populate('comments.user', 'username role');

    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check authorization: Admin or creator
    const isAdmin = req.user.role === 'admin';
    const isCreator = task.createdBy.toString() === req.user._id.toString();

    if (!isAdmin && !isCreator) {
      return res.status(403).json({ message: 'Not authorized to delete this task' });
    }

    await task.deleteOne();

    res.json({ message: 'Task removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Assign task to users
// @route   POST /api/tasks/:id/assign
// @access  Private
const assignTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const isAdmin = req.user.role === 'admin';
    const isCreator = task.createdBy.toString() === req.user._id.toString();

    if (!isAdmin && !isCreator) {
      return res.status(403).json({ message: 'Not authorized to assign this task' });
    }

    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ message: 'Please provide a user ID' });
    }

    task.assignedTo = userId;
    task.history.push({
      action: 'Task Assigned',
      user: req.user._id,
      details: `Task assigned to user ${userId}`
    });
    
    await task.save();

    const updatedTask = await Task.findById(task._id)
      .populate('createdBy', 'username email role')
      .populate('assignedTo', 'username email role');

    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { getTasks, createTask, updateTask, deleteTask, assignTask };