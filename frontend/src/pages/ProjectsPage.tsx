import React, { useState } from 'react';
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, Alert,
  CircularProgress, MenuItem,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/client';
import { type Project, type Client } from '../types/api';
import StatusChip from '../components/StatusChip';
import EmptyCell from '../components/EmptyCell';

interface ProjectFormData {
  name: string;
  description: string;
  clientId: string | number;
  startDate: string;
  status: 'active' | 'completed' | 'on-hold';
}

const emptyForm: ProjectFormData = { name: '', description: '', clientId: '', startDate: '', status: 'active' };

const ProjectsPage: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState<ProjectFormData>(emptyForm);
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  const { data: projectsData, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiClient.getProjects(),
  });

  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: () => apiClient.getClients(),
  });

  const onMutationError = (err: unknown, fallbackMsg: string) => {
    const e = err as { response?: { data?: { error?: string } } };
    setError(e.response?.data?.error || fallbackMsg);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingProject(null);
    setFormData(emptyForm);
    setError('');
  };

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string | null; clientId?: number | null; startDate?: string | null; status?: string }) =>
      apiClient.createProject(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['projects'] }); handleClose(); },
    onError: (err: unknown) => onMutationError(err, 'Failed to create project'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name?: string; description?: string | null; clientId?: number | null; startDate?: string | null; status?: string } }) =>
      apiClient.updateProject(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['projects'] }); handleClose(); },
    onError: (err: unknown) => onMutationError(err, 'Failed to update project'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.deleteProject(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['projects'] }); },
    onError: (err: unknown) => onMutationError(err, 'Failed to delete project'),
  });

  const projects: Project[] = projectsData?.projects || [];
  const clients: Client[] = clientsData?.clients || [];
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const handleOpen = (project?: Project) => {
    if (project) {
      setEditingProject(project);
      setFormData({
        name: project.name,
        description: project.description || '',
        clientId: project.client_id || '',
        startDate: project.start_date || '',
        status: project.status,
      });
    } else {
      setEditingProject(null);
      setFormData(emptyForm);
    }
    setError('');
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!formData.name.trim()) { setError('Project name is required'); return; }

    const payload = {
      name: formData.name,
      description: formData.description || null,
      clientId: formData.clientId ? Number(formData.clientId) : null,
      startDate: formData.startDate || null,
      status: formData.status,
    };

    if (editingProject) {
      updateMutation.mutate({ id: editingProject.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Projects</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
          Add Project
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Client</TableCell>
                <TableCell>Start Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {projects.length > 0 ? projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell>
                    <Typography variant="subtitle1" fontWeight="medium">{project.name}</Typography>
                  </TableCell>
                  <TableCell><EmptyCell value={project.client_name} emptyLabel="Unassigned" /></TableCell>
                  <TableCell>
                    <EmptyCell value={project.start_date ? new Date(project.start_date).toLocaleDateString() : null} />
                  </TableCell>
                  <TableCell><StatusChip status={project.status} /></TableCell>
                  <TableCell><EmptyCell value={project.description} emptyLabel="No description" /></TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(project.created_at).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton onClick={() => handleOpen(project)} color="primary" size="small"><EditIcon /></IconButton>
                    <IconButton onClick={() => { if (window.confirm(`Delete "${project.name}"?`)) deleteMutation.mutate(project.id); }} color="error" size="small"><DeleteIcon /></IconButton>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography color="text.secondary" sx={{ py: 3 }}>
                      No projects found. Create your first project to get started.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editingProject ? 'Edit Project' : 'Add New Project'}</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <TextField autoFocus margin="dense" label="Project Name" fullWidth required
              value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} disabled={isSaving} />
            <TextField margin="dense" label="Client" fullWidth select
              value={formData.clientId} onChange={(e) => setFormData({ ...formData, clientId: e.target.value })} disabled={isSaving}>
              <MenuItem value=""><em>None</em></MenuItem>
              {clients.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </TextField>
            <TextField margin="dense" label="Start Date" fullWidth type="date"
              value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              disabled={isSaving} InputLabelProps={{ shrink: true }} />
            <TextField margin="dense" label="Status" fullWidth select
              value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as ProjectFormData['status'] })} disabled={isSaving}>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="on-hold">On Hold</MenuItem>
            </TextField>
            <TextField margin="dense" label="Description" fullWidth multiline rows={3}
              value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} disabled={isSaving} />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose} disabled={isSaving}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isSaving}>
              {isSaving ? <CircularProgress size={24} /> : (editingProject ? 'Update' : 'Create')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default ProjectsPage;
